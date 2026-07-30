 /ffmpeg / dist / esm / utils.js
/**
 * Generate an unique message ID.
 */
export const getMessageID = (() => {
    let messageID = 0;
    return () => messageID++;
})();
