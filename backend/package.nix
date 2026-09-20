{
  lib,
  rustPlatform,
}:
rustPlatform.buildRustPackage {
  pname = "me-backend";
  version = "0.1.0";
  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [../Cargo.toml ../Cargo.lock ./Cargo.toml ./src ./tests ./migrations];
  };
  cargoLock.lockFile = ../Cargo.lock;
  meta.mainProgram = "me-backend";
}
