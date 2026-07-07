export const config = {
    atem: {
        ip: '192.168.177.63',
        videoInput: 16,
        stageAuxBuses: [3, 4], // aux outputs feeding the stage
        stageCasparSource: 16, // caspar video input number on those auxes
        // Projector aux outputs, each routed to a given ME's program bus.
        projectorAuxes: [
            { aux: 1, me: 1 }, // Aux output 1 -> ME/1 program
            { aux: 2, me: 2 }, // Aux output 2 -> ME/2 program
        ],
    },
};
