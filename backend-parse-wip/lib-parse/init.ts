import Parse from "parse";

export function isParseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_PARSE_APP_ID &&
      process.env.NEXT_PUBLIC_PARSE_SERVER_URL,
  );
}

const CONFIG_ERROR =
  "Parse Server non configuré : remplissez NEXT_PUBLIC_PARSE_APP_ID, " +
  "NEXT_PUBLIC_PARSE_JS_KEY et NEXT_PUBLIC_PARSE_SERVER_URL dans .env.local " +
  "(voir PARSE_SETUP.md), puis relancez le serveur.";

let initialized = false;

/** Initialise le SDK Parse une seule fois (partagé client + serveur). */
export function ensureParseInitialized(): typeof Parse {
  if (!isParseConfigured()) {
    throw new Error(CONFIG_ERROR);
  }
  if (!initialized) {
    const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID as string;
    const jsKey = process.env.NEXT_PUBLIC_PARSE_JS_KEY;
    const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL as string;
    Parse.initialize(appId, jsKey);
    Parse.serverURL = serverURL;
    initialized = true;
  }
  return Parse;
}
