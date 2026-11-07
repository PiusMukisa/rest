(function () {
  let client;

  window.getRestChurchClient = function () {
    const config = window.REST_CHURCH_CONFIG;
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
      return null;
    }

    if (!client) {
      if (!window.supabase || typeof window.supabase.createClient !== "function") {
        throw new Error("The Supabase client library did not load.");
      }

      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.sessionStorage
        }
      });
    }

    return client;
  };
})();
