export const config = {
    artnet: {
        universe: 1,
        channel: 230,
        net: 0, // 0-127
        subnet: 0,
    },

    artnetSend: {
        ip: '192.168.100.x',
        subnetStart: 101,
        universeStart: 6,

        count: 12,
    },

    atem: {
        ip: '',
        videoInput: 18,
    },
};
