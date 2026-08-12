/**
 * Verrou asynchrone en mémoire, par clé.
 *
 * Remplace le `select … for update` de Postgres pour tout ce qui doit
 * lire-vérifier-écrire sans qu'un appel concurrent ne s'intercale.
 *
 * ## Pourquoi `increment()` + `beforeSave` ne suffit pas
 *
 * La première version de ce garde-fou reposait sur `Parse.Object#increment`
 * plus une vérification dans `beforeSave`. Un test de charge réel (voir
 * parse-server/test/migration-smoke-test.js) a montré que ça ne protège
 * rien : `request.object.get(champ)` dans `beforeSave`, pour un champ
 * modifié via `increment()`, reflète l'estimation calculée CÔTÉ CLIENT à
 * partir de la valeur lue au tout début de la fonction — pas la valeur
 * réelle en base au moment de l'écriture. Cinq appels concurrents qui lisent
 * tous `stock = 3` calculent chacun `3 - 1 = 2` en local ; le garde-fou voit
 * `2 ≥ 0` cinq fois de suite, pendant que Mongo applique cinq `$inc`
 * atomiques réels sur la vraie valeur — résultat observé lors du test :
 * stock final à -2. `request.original` (utilisé pour les enchères) est
 * recalculé côté serveur à chaque déclenchement, mais rien ne garantit
 * qu'il soit lu APRÈS qu'une écriture concurrente ait committé : cinq
 * requêtes lancées ensemble peuvent toutes lire le même état pas encore mis
 * à jour — observé aussi lors du test : 5 mises identiques acceptées sur 5.
 *
 * ## Pourquoi un verrou en mémoire est la bonne réponse ici
 *
 * Parse Server n'expose aucune mise à jour conditionnelle atomique
 * (« décrémenter seulement si stock ≥ N ») via l'API Object/Query — choix
 * délibéré pour rester agnostique du moteur de stockage. Sans verrou de
 * ligne ni mise à jour conditionnelle, la seule garantie qui reste est la
 * sérialisation au niveau du process : Node.js est mono-thread, et ce
 * déploiement ne fait tourner qu'un seul process Parse (un conteneur, pas
 * de réplication horizontale). Un verrou par clé, purement en mémoire,
 * suffit donc à sérialiser complètement l'accès à une même ressource
 * contestée.
 *
 * **Limite explicite** : ceci suppose un seul process Parse Server. Si ce
 * déploiement passe un jour à plusieurs instances derrière un
 * load-balancer, ce verrou ne protège plus rien — il faudra alors soit un
 * verrou distribué (Redis, par exemple), soit une mise à jour conditionnelle
 * atomique exploitée directement au niveau de la base pour ce chemin précis.
 */

const tails = new Map(); // clé -> promesse (ne rejette jamais) marquant la fin du dernier appel en file

/**
 * Exécute `fn` une fois que toute exécution précédente sur la même `key`
 * est terminée, qu'elle ait réussi ou échoué. Les clés différentes
 * s'exécutent librement en parallèle — seule la contention sur une même
 * ressource (même produit, même enchère, même portefeuille) est sérialisée.
 *
 * Renvoie le résultat (ou l'échec) de `fn`, pas celui des appels précédents.
 */
function withLock(key, fn) {
  const previousTail = tails.get(key) ?? Promise.resolve();
  const result = previousTail.then(fn);

  // La file ne doit jamais se bloquer parce qu'un appel a échoué : le
  // maillon suivant attend seulement que celui-ci soit *terminé*, pas
  // qu'il ait réussi.
  const tail = result.then(
    () => {},
    () => {},
  );
  tails.set(key, tail);

  // Ménage : si personne ne s'est mis en file derrière nous entre-temps, on
  // retire l'entrée pour ne pas faire grossir la Map indéfiniment sur un
  // serveur qui tourne des mois avec des milliers de produits différents.
  tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });

  return result;
}

module.exports = { withLock };
