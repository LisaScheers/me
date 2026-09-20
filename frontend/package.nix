{
  lib,
  stdenvNoCC,
  nodejs,
  pnpm_10,
  fetchPnpmDeps,
  pnpmConfigHook,
}:
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "lisa-personal-site";
  version = "1.0.0";
  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [../package.json ../pnpm-lock.yaml ../pnpm-workspace.yaml ./src ./public ./package.json ./astro.config.mjs];
  };
  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    pnpm = pnpm_10;
    fetcherVersion = 3;
    hash = "sha256-P6xAcESy2zBclx4qJ+HBTHCp3oJc9P/+5dYw/xLE3mc=";
  };
  nativeBuildInputs = [nodejs pnpm_10 pnpmConfigHook];
  env.ASTRO_TELEMETRY_DISABLED = "1";
  buildPhase = ''
    runHook preBuild
    pnpm build
    runHook postBuild
  '';
  installPhase = ''
    mkdir -p "$out"
    cp -r frontend/dist/. "$out/"
  '';
})
