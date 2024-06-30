export const config = {
    artnet: {
        universe: 0,
        channel: 1,
        net: (253 >> 4) & 0xF, // 0-127
        subnet: 253 & 0xF,
    },

    atem: {
        ip: '192.168.177.63',
        videoInput: 18,
    },
};
