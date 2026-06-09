export const config = {
    artnet: {
        universe: 1,
        channel: 230,
        net: 0, // 0-127
        subnet: 0,
    },

    artnet_send: {
        ip: '192.168.100.x',
        subnet_start: 101,
        universe_start: 6,

        count: 12,
    },

    atem: {
        ip: '',
        videoInput: 18,
    },
};
