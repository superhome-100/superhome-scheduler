import { assignRsvsToBuoys } from '../src/lib/autoAssign.js';
import fs from 'fs';

function readTestData() {
    let data = fs.readFileSync('autoAssign-tests.json');
    let { users, rsvs, buoys } = JSON.parse(data);
    return { users, rsvs, buoys };
}

function runTests(aDate, aOwTime) {
    const { rsvs, buoys } = readTestData();

    let dates, owTimes;
    if (aDate) {
        dates = [aDate];
    } else {
        dates = new Set(rsvs.map((rsv) => rsv.date));
    }
    if (aOwTime) {
        owTimes = [aOwTime];
    } else {
        owTimes = ['AM', 'PM'];
    }

    let failures = [];
    for (let date of dates) {
        for (let owTime of owTimes) {
            console.log('**** ' + date + '    ' + owTime + ' ****');
            let testRsvs = rsvs.filter((rsv) => {
                return rsv.date === date
                    && rsv.category === 'openwater'
                    && rsv.owTime == owTime
            });
            if (runTest(buoys, testRsvs)) {
                failures.push({ date, owTime });
            }
        }
    }
}

function checkMultiples(assignments) {
    let rsvArr = [];
    for (let buoy in assignments) {
        rsvArr.push(...assignments[buoy].map((rsv) => rsv.id));
    }
    let rsvSet = new Set(rsvArr);
    if (rsvArr.length > rsvSet.size) {
        console.log('ERROR: Multiple assignment');
        for (let buoy in assignments) {
            console.log(buoy + ': ' + assignments[buoy].map((rsv) => rsv.maxDepth));
        }
        return 1;
    }
    return 0;
}

function checkResTypeMix(assignments) {
    for (let buoy in assignments) {
        let course = false;
        let auto = false;
        for (let rsv of assignments[buoy]) {
            if (rsv.resType === 'course') {
                course = true;
            } else if (rsv.resType === 'autonomous') {
                auto = true;
            }
        }
        if (course && auto) {
            console.log('WARNING: course/auto mix');
            for (let b in assignments) {
                console.log('buoy ' + b);
                for (let rsv of assignments[b]) {
                    console.log(rsv.resType + ': ' + rsv.maxDepth);
                }
            }
        }
    }
}

function runTest(buoys, rsvs) {
    let result = assignRsvsToBuoys(buoys, rsvs);
    console.log(result.status);
    checkMultiples(result.assignments);
    checkResTypeMix(result.assignments);
    if (result.status === 'error') {
        console.log(result.message);
        return 1;
    } else if (result.status === 'success') {
        return 0;
    } else {
        console.log('unknown result form');
        return 1;
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

//test1();
//test2();
//test3();

let daterx = /date=([0-9]+-[0-9]+-[0-9]+)/;
let owrx = /owTime=([APM]+)/;

let date, owTime;
for (let arg of process.argv) {
    let m = daterx.exec(arg);
    if (m) {
        date = m[1];
    }
    m = owrx.exec(arg);
    if (m) {
        owTime = m[1];
    }
}

runTests(date, owTime);


