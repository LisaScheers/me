# Lisa’s website

[bylisa.dev](https://bylisa.dev)

Public OpenPGP certificate: [pgp.asc](https://bylisa.dev/pgp.asc)

Fingerprint: `15E4 98C9 7D78 301A 8CB8 9660 EDB3 7F80 DA8C AD84`.

## Run locally

From the repository root, with [Nix](https://nixos.org/download/) and
[devenv](https://devenv.sh/getting-started/) installed:

```sh
devenv shell
pnpm install --frozen-lockfile
devenv up
```

Open http://127.0.0.1:8789. This starts the website and view counter together.
Press Ctrl+C to stop both. To run just one server, use `devenv up frontend`
or `devenv up backend`. Use `devenv up --detach` to run in the background
and `devenv down` to stop background servers.

The counter uses port 8790 and saves local counts in `.data/views.sqlite3`.
Stop any existing preview using these ports first.

You can also enter the shell with `nix develop --impure`, or use `direnv allow`
for automatic activation. When opening the project in Zed, allow direnv so
rust-analyzer can find the Rust toolchain.

## Test and build

Inside the development shell, run `treefmt` to format the project. To check formatting
and run tests:

```sh
treefmt --fail-on-change
pnpm lint
cargo test --locked --workspace
pnpm test
pnpm build
```

`pnpm fmt` runs Oxfmt; `pnpm fmt:check` checks its formatting.
`treefmt` also formats Astro, Nix, Rust, TOML, and shell files.

The website is built into `frontend/dist/`. To build with Nix:

```sh
nix build .#frontend
nix build .#backend
nix flake check
```

## Add your 88×31 button

Save your PNG or GIF in `frontend/public/personal-site/buttons/`.
Add a link inside `.site-buttons` in
`frontend/src/components/NeighboursWindow.astro`:

```html
<a href="https://example.com/" title="Your name">
  <img src="/personal-site/buttons/your-name.png" alt="Your name" width="88" height="31" />
</a>
```

Check the page at desktop and mobile sizes after adding a button.

To replace this site’s own badge, update `frontend/public/88x31.gif` and
`frontend/public/88x31.png` (the still image used for reduced motion).
Update the download filename, description, and embed HTML in
`frontend/src/components/NeighboursWindow.astro` too.

To regenerate the existing moon animation:

```sh
./frontend/scripts/animate-button.sh
```

## Use Lisa’s button on your site

Download [the button](https://bylisa.dev/88x31.gif), save it as
`/buttons/lisa-88x31.gif` on your site, and add:

```html
<a href="https://bylisa.dev/">
  <img src="/buttons/lisa-88x31.gif" alt="Lisa’s website" width="88" height="31" />
</a>
```
