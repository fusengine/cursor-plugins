import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function visitDirectory(root, relative, hash) {
  const directory = path.join(root, relative);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const childRelative = path.join(relative, entry.name);
    const child = path.join(root, childRelative);
    if (entry.isSymbolicLink()) throw new Error(`owned artifact contains a symlink: ${child}`);
    hash.update(`${childRelative}\0${entry.isDirectory() ? "d" : "f"}\0`);
    if (entry.isDirectory()) visitDirectory(root, childRelative, hash);
    else if (entry.isFile()) hash.update(fs.readFileSync(child));
    else throw new Error(`unsupported owned artifact type: ${child}`);
  }
}

/** Hash a real directory tree deterministically without following symlinks. */
export function hashDirectory(root) {
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`expected real directory: ${root}`);
  const hash = crypto.createHash("sha256");
  visitDirectory(root, "", hash);
  return hash.digest("hex");
}

/** Hash a real regular file without following symlinks. */
export function hashFile(file) {
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`expected real file: ${file}`);
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
