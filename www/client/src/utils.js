/*
  Utility functions for the Depinus web client
*/

export const formattedPlaytime = (seconds) => {
    if (seconds > 0) {
        let result = new Date(seconds * 1000).toISOString().slice(11, 19);
        if (result.startsWith('0')) {
            result = result.slice(1); // remove leading 0 from hours
        }
        if (result.startsWith('0:')) {
            result = result.slice(2); // remove whole hours part
        }
        if (result.startsWith('0')) {
            result = result.slice(1); // remove leading 0 from minutes
        }
        return result; // something like '1:23:45'
    }
    else {
        return '0:00'; // workaround for midi time shift
    }
};
