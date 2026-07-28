/**
 * Normalizes a memory key to be lowercase, trimmed, and with non-alphanumeric characters replaced by underscores.
 * @param {string} key 
 * @returns {string}
 */
export const normalizeMemoryKey = (key) => {
    if (!key) return "";
    return key.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
};
