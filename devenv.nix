{
  pkgs,
  lib,
  ...
}: {
  packages = with pkgs; [sqlite];
  env = {
    ASTRO_TELEMETRY_DISABLED = "1";
    COUNTER_DB = ".data/views.sqlite3";
    SITE_ORIGIN = "http://127.0.0.1:8789";
    PORT = "8790";
  };

  processes = {
    frontend.exec = "pnpm dev";
    backend.exec = "cargo run --locked -p me-backend";
  };

  # Keep formatting explicit; frontend dependencies may not be installed on shell entry.
  tasks."devenv:treefmt:run".before = lib.mkForce [];

  treefmt = {
    enable = true;
    config = {
      projectRootFile = "flake.nix";
      programs = {
        alejandra.enable = true;
        rustfmt.enable = true;
        shfmt.enable = true;
        taplo.enable = true;
      };
      settings = {
        global.excludes = ["*.lock" "pnpm-lock.yaml" "frontend/public/*"];
        formatter.astro = {
          command = "${pkgs.pnpm_10}/bin/pnpm";
          options = ["exec" "prettier" "--plugin" "prettier-plugin-astro" "--write"];
          includes = ["*.astro"];
        };
        formatter.oxfmt = {
          command = "${pkgs.pnpm_10}/bin/pnpm";
          options = ["exec" "oxfmt" "--write"];
          includes = ["*.mjs" "*.js" "*.css" "*.json" "*.md" "*.yaml" "*.yml"];
        };
      };
    };
  };

  languages = {
    rust.enable = true;
    javascript = {
      enable = true;
      pnpm.enable = true;
    };
  };
}
