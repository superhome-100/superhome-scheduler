import { assignRsvsToBuoys } from './autoAssign.js';

function runTest(buoys, rsvs) {
    let result = assignRsvsToBuoys(buoys, rsvs);
    console.log(result.status);
    if (result.status === 'error') {
        console.log(result.message);
        console.log(result.detail);
    } else if (result.status === 'success') {
        for (let buoy in result.assignments) {
            console.log(buoy + ': ' + result.assignments[buoy].map((rsv) => rsv.maxDepth));
        }
    } else {
        console.log('unknown result form');
    }
}

function test1() {
    const buoys = [
        { name: 'A', maxDepth: 45, capacity: 4 },
        { name: 'B', maxDepth: 60, capacity: 4 },
    ];

    const rsvs = [
        { id: 0, user: { id: 0 }, maxDepth: 20, buddies: { id: [1,2] }},
        { id: 1, user: { id: 1 }, maxDepth: 25, buddies: { id: [] }},
        { id: 2, user: { id: 2 }, maxDepth: 29, buddies: { id: [] }},
        { id: 3, user: { id: 3 }, maxDepth: 45, buddies: { id: [4] }},
        { id: 4, user: { id: 4 }, maxDepth: 50, buddies: { id: [5] }},
        { id: 5, user: { id: 5 }, maxDepth: 55, buddies: { id: [] }},
    ];

   runTest(buoys, rsvs);
}

function test2() {
    const buoys = [
        { name: 'A', maxDepth: 50, capacity: 4, resType: 'autonomous'},
        { name: 'B', maxDepth: 65, capacity: 4, resType: 'autonomous' },
        { name: 'C', maxDepth: 80, capacity: 4, resType: 'autonomous' },
        { name: 'D', maxDepth: 100, capacity: 4, resType: 'autonomous' },
    ];
    const rsvs = [
        { id: 0, user: { id: 0 }, maxDepth: 42, buddies: { id: [] }, resType: 'autonomous'},
        { id: 1, user: { id: 1 }, maxDepth: 50, buddies: { id: [] }, resType: 'autonomous'},
        { id: 2, user: { id: 2 }, maxDepth: 80, buddies: { id: [6] }, resType: 'autonomous'},
        { id: 3, user: { id: 3 }, maxDepth: 65, buddies: { id: [1] }, resType: 'autonomous'},
        { id: 4, user: { id: 4 }, maxDepth: 62, buddies: { id: [] }, resType: 'autonomous'},
        { id: 5, user: { id: 5 }, maxDepth: 85, buddies: { id: [11] }, resType: 'autonomous'},
        { id: 6, user: { id: 6 }, maxDepth: 72, buddies: { id: [] }, resType: 'autonomous'},
        { id: 7, user: { id: 7 }, maxDepth: 50, buddies: { id: [] }, resType: 'autonomous'},
        { id: 8, user: { id: 8 }, maxDepth: 45, buddies: { id: [] }, resType: 'autonomous'},
        { id: 9, user: { id: 9 }, maxDepth: 65, buddies: { id: [] }, resType: 'autonomous'},
        { id: 10, user: { id: 10 }, maxDepth: 56, buddies: { id: [] }, resType: 'autonomous'},
        { id: 11, user: { id: 11 }, maxDepth: 70, buddies: { id: [] }, resType: 'autonomous'},
    ];

    runTest(buoys, rsvs);
}

function test3() {
    const buoys = [
        { name: 'A', maxDepth: 50, capacity: 4, resType: 'autonomous'},
        { name: 'B', maxDepth: 65, capacity: 4, resType: 'autonomous' },
        { name: 'C', maxDepth: 80, capacity: 4, resType: 'autonomous' },
        { name: 'D', maxDepth: 100, capacity: 4, resType: 'autonomous' },
    ];
    const rsvs = [
        {
            id: 0,
            user: { id: 0 },
            maxDepth: 20,
            buddies: { id: [] },
            resType: 'course',
            numStudents: 2
        },
        { id: 2, user: { id: 2 }, maxDepth: 80, buddies: { id: [6] }, resType: 'autonomous'},
        { id: 3, user: { id: 3 }, maxDepth: 65, buddies: { id: [1] }, resType: 'autonomous'},
        { id: 4, user: { id: 4 }, maxDepth: 62, buddies: { id: [] }, resType: 'autonomous'},
        { id: 5, user: { id: 5 }, maxDepth: 85, buddies: { id: [11] }, resType: 'autonomous'},
        { id: 6, user: { id: 6 }, maxDepth: 72, buddies: { id: [] }, resType: 'autonomous'},
        { id: 7, user: { id: 7 }, maxDepth: 50, buddies: { id: [] }, resType: 'autonomous'},
        { id: 9, user: { id: 9 }, maxDepth: 65, buddies: { id: [] }, resType: 'autonomous'},
        { id: 10, user: { id: 10 }, maxDepth: 56, buddies: { id: [] }, resType: 'autonomous'},
        { id: 11, user: { id: 11 }, maxDepth: 70, buddies: { id: [] }, resType: 'autonomous'},
    ];
    runTest(buoys, rsvs);
}

test1();
test2();
test3();





