/**
 * Cloud Code — point d'entrée.
 *
 * Chaque module correspond à un pan de la migration décrite dans
 * PARSE_MIGRATION.md. L'ordre des require compte : le schéma et les rôles
 * doivent être en place avant que les fonctions métier ne s'appuient dessus.
 */

require("./schema");
require("./roles");
require("./hooks");
require("./orders");
