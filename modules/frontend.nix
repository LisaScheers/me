{...}: {
  perSystem = {
    pkgs,
    config,
    ...
  }: {
    packages.frontend = pkgs.callPackage ../frontend/package.nix {};
    packages.default = config.packages.frontend;
    checks.frontend = config.packages.frontend;
  };
}
