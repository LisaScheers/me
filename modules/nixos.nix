{config, ...}: {
  flake.modules.nixos.website = {
    config,
    lib,
    pkgs,
    ...
  }: let
    cfg = config.services.lisaWebsite;
    site = pkgs.callPackage ../frontend/package.nix {};
    backend = pkgs.callPackage ../backend/package.nix {};
  in {
    options.services.lisaWebsite = {
      enable = lib.mkEnableOption "Lisa's static website and aggregate view counter";
      domain = lib.mkOption {
        type = lib.types.str;
        default = "bylisa.dev";
      };
      counterPort = lib.mkOption {
        type = lib.types.port;
        default = 8790;
      };
    };
    config = lib.mkIf cfg.enable {
      systemd.services.lisa-website-counter = {
        description = "Aggregate page-load counter for Lisa's website";
        wantedBy = ["multi-user.target"];
        after = ["network.target"];
        environment = {
          COUNTER_DB = "/var/lib/lisa-website-counter/views.sqlite3";
          SITE_ORIGIN = "https://${cfg.domain}";
          PORT = toString cfg.counterPort;
        };
        serviceConfig = {
          ExecStart = "${backend}/bin/me-backend";
          DynamicUser = true;
          StateDirectory = "lisa-website-counter";
          StateDirectoryMode = "0700";
          UMask = "0077";
          Restart = "on-failure";
          NoNewPrivileges = true;
          ProtectSystem = "strict";
          ProtectHome = true;
          PrivateTmp = true;
        };
      };
      services.nginx.virtualHosts.${cfg.domain}.locations = {
        # Preserve the existing Bluesky catch-all and Matrix discovery routes.
        "= /" = {
          root = "${site}";
          tryFiles = "/index.html =404";
          extraConfig = ''
            default_type text/html;
            add_header Cache-Control "no-cache";
          '';
        };
        "^~ /personal-site/" = {
          alias = "${site}/personal-site/";
          extraConfig = ''
            types {
              text/css css;
              application/javascript js mjs;
              image/svg+xml svg;
              image/png png;
              image/gif gif;
              image/webp webp;
            }
            add_header Cache-Control "no-cache";
          '';
        };
        "= /88x31.gif" = {
          alias = "${site}/88x31.gif";
          extraConfig = ''
            default_type image/gif;
            add_header Cache-Control "public, max-age=3600";
          '';
        };
        "= /88x31.png" = {
          alias = "${site}/88x31.png";
          extraConfig = ''
            default_type image/png;
            add_header Cache-Control "public, max-age=3600";
          '';
        };
        "= /pgp.asc" = {
          alias = "${site}/pgp.asc";
          extraConfig = ''
            default_type application/pgp-keys;
            add_header Cache-Control "public, max-age=3600";
          '';
        };
        "= /api/views" = {
          proxyPass = "http://127.0.0.1:${toString cfg.counterPort}";
          extraConfig = ''
            access_log off;
            client_max_body_size 1k;
            proxy_read_timeout 15s;
            limit_except GET POST { deny all; }
          '';
        };
      };
    };
  };
  flake.nixosModules.default = config.flake.modules.nixos.website;
}
