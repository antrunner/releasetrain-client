const util = (() => {

    function isFirstLetterAlphabetic(str) {
        if (str.length === 0) return false; // Check if the string is empty
        return /^[A-Za-z]/.test(str.charAt(0));
    }
    // try {
    //     module.exports = isFirstLetterAlphabetic;
    // } catch (e) {}
    return { isFirstLetterAlphabetic }
})()
export default util;