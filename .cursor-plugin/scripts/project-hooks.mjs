/** Project-relative Cursor loader command prefix owned by this installer. */
export const baseCommand = "node .cursor/fusengine/load-plugins.mjs";

/** Build the uniquely owned loader command persisted in the install receipt. */
export function loaderCommand(token) {
  return `${baseCommand} --fusengine-owner=${token}`;
}

function isMatching(entry) {
  return entry && !Array.isArray(entry) && typeof entry === "object"
    && (entry.command === baseCommand || new RegExp(`^${baseCommand.replaceAll(".", "\\.")} --fusengine-owner=[a-f0-9]{16}$`).test(entry.command));
}

function isExact(entry, command) {
  return isMatching(entry) && entry.command === command && Object.keys(entry).length === 1;
}

/** Merge a loader entry only when no matching foreign entry already supplies discovery. */
export function mergeLoaderHook(document, previousReceipt, candidateToken) {
  const entries = document.hooks.workspaceOpen;
  if (previousReceipt.hookAdded === true && /^[a-f0-9]{16}$/.test(previousReceipt.hookToken ?? "")) {
    const command = loaderCommand(previousReceipt.hookToken);
    let hookIndex = previousReceipt.hookIndex;
    if (!Number.isInteger(hookIndex) || !isExact(entries[hookIndex], command)) {
      const indexes = entries.flatMap((entry, index) => isExact(entry, command) ? [index] : []);
      hookIndex = indexes.length === 1 ? indexes[0] : -1;
    }
    if (hookIndex < 0) {
      hookIndex = entries.length;
      entries.push({ command });
    }
    return { document, hookAdded: true, hookCommand: command, hookIndex, hookToken: previousReceipt.hookToken };
  }
  if (entries.some(isMatching)) return { document, hookAdded: false, hookCommand: baseCommand, hookIndex: -1, hookToken: null };
  const command = loaderCommand(candidateToken);
  const hookIndex = entries.length;
  entries.push({ command });
  return { document, hookAdded: true, hookCommand: command, hookIndex, hookToken: candidateToken };
}

/** Remove at most one exact canonical entry, and only when the receipt says we added it. */
export function removeLoaderHook(document, receipt) {
  if (receipt.hookAdded !== true || !/^[a-f0-9]{16}$/.test(receipt.hookToken ?? "")) return false;
  const entries = document.hooks?.workspaceOpen;
  if (!Array.isArray(entries)) return false;
  const command = loaderCommand(receipt.hookToken);
  let index = receipt.hookIndex;
  if (!Number.isInteger(index) || !isExact(entries[index], command)) {
    const indexes = entries.flatMap((entry, entryIndex) => isExact(entry, command) ? [entryIndex] : []);
    if (indexes.length !== 1) throw new Error("owned loader hook occurrence is missing or ambiguous");
    [index] = indexes;
  }
  entries.splice(index, 1);
  if (entries.length === 0) delete document.hooks.workspaceOpen;
  return true;
}
