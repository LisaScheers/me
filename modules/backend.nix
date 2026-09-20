{...}: {
  perSystem = {
    pkgs,
    config,
    ...
  }: {
    packages.backend = pkgs.callPackage ../backend/package.nix {};
    checks.backend = config.packages.backend;
  };
}
