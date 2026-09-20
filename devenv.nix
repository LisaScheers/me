{pkgs, ...}: {
  packages = with pkgs; [sqlite];
  env = {
    ASTRO_TELEMETRY_DISABLED = "1";
    COUNTER_DB = ".data/views.sqlite3";
    SITE_ORIGIN = "http://127.0.0.1:8789";
    PORT = "8790";
  };

  languages = {
    rust.enable = true;
    javascript = {
      enable = true;
      pnpm.enable = true;
    };
  };
}
