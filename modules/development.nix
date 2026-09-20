{inputs, ...}: {
  imports = [inputs.devenv.flakeModule];
  perSystem = {pkgs, ...}: {
    formatter = pkgs.alejandra;
    devenv.shells.default = {
      devenv.flakesIntegration = true;
      devenv.root = pkgs.lib.mkOverride 90 (let
        rootFromInput = builtins.readFile inputs.devenv-root.outPath;
        currentDirectory = builtins.getEnv "PWD";
      in
        if rootFromInput != ""
        then rootFromInput
        else if currentDirectory != ""
        then currentDirectory
        else toString ../.);
      imports = [../devenv.nix];
    };
  };
}
