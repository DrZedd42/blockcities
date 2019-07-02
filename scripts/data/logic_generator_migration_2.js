module.exports = {
    data: {
        city: {
            config: {
                // ATL
                0: [2, 2, 2, 2, 2, 5, 5, 5, 15, 15],

                // NYC
                1: [4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8],

                // CHI
                2: [1, 1, 1, 1, 9, 10, 10, 10, 11, 11],

                // SF
                3: [12, 13]
            }
        },
        buildings: {
            1: {
                base: [7],
                roof: [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 5, 5, 5, 5, 5, 7, 7, 7, 7],
            },
            2: {
                base: [8, 8, 9, 9, 9, 9, 9, 10, 10, 10],
                roof: [0, 0, 0, 0, 1, 1, 2, 2, 2, 4, 4, 5, 5, 5, 8, 8, 9, 9, 9, 9], // FIXED
            },
            4: {
                base: [7, 8, 9, 10, 10],
            },
            5: {
                base: [8, 8, 8, 9, 9, 10, 10, 10, 10, 10],
            },
            6: {
                base: [6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 9],
            },
            7: {
                base: [3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
            },
            8: {
                base: [6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 12, 13, 14],
            },
            9: {
                body: [6, 7, 8, 9, 10, 11, 11, 12, 12, 12, 13, 13, 14, 14, 14, 14, 15, 15, 15, 15],
            },
            10: {
                roof: [5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
            },
            11: {
                base: [6, 7, 7, 7, 8, 8, 8, 8, 9, 9, 10, 10, 10, 11, 12, 12, 12, 13, 13, 13],
                roof: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 6],
            },
            12: {
                body: [11, 12, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 17, 18, 18, 19, 20, 21],
            },
            13: {
                base: [7],
                body: [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 4, 4, 4, 5, 5, 6, 7, 8, 8, 8],
            },
            15: {
                base: [7, 7, 7, 8, 8],
                roof: [0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 5, 5, 6, 6, 6, 7, 7, 7, 7],
            }
        }
    }
};