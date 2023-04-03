import { faker } from '@faker-js/faker';
import { XataClient } from '../src/lib/server/xata.codegen.server.js';
import { datetimeToLocalDateStr } from '../src/lib/datetimeUtils.js';
import { startTimes, endTimes, minValidDate } from '../src/lib/ReservationTimes.js';
import { settings } from '../src/lib/stores.js';
import { parseSettingsTbl, checkSpaceAvailable } from '../src/lib/utils.js';
import fs from 'fs';

const XATA_API_KEY='xau_9xJINLTWEBX1d0EyWIi7YL9QinLT2TEv1';

const xata = new XataClient({ apiKey: XATA_API_KEY });

function createRandomUser() {
    return {
        facebookId: faker.random.numeric(17),
        name: faker.name.firstName() + ' ' + faker.name.lastName(),
        status: 'active'
    }
}

export function createRandomUsers(N) {
    let entries = [];
    for (let i=0; i<N; i++) {
        entries.push(createRandomUser());
    }
    return entries;
}

async function addRandomUsers(N) {
    let entries = createRandomUsers(N);
    const records = await xata.db.Users.create(entries);
    return records;
}

const randomInt = (max) => Math.floor(Math.random() * max);
const rSelect = (arr) => arr[randomInt(arr.length)];

function createRandomRsv(buddyPool, buddyDepth, rsv) {
    let buddies = {
        id: [],
        name: []
    };
    if (rsv.resType === 'autonomous') {
        let id = new Set();
        let name = new Set();
        for (let i=0; i < 1 + randomInt(buddyPool.length); i++) {
            let buddy = rSelect(buddyPool);
            if (buddy.id != rsv.user) {
                id.add(buddy.id);
                name.add(buddy.name);
            }
        }
        buddies.id = Array.from(id);
        buddies.name = Array.from(name);
    }
    const rSign = () => Math.random() > 0.5 ? 1 : -1;
    return {
        ...rsv,
        numStudents: rsv.resType === 'course' ? 1 + randomInt(4) : null,
        maxDepth: rsv.category === 'openwater' ? buddyDepth + rSign()*randomInt(15) : null,
        comments: faker.lorem.lines(1),
        status: 'pending',
        owner: true,
        buddies,
    };
}

function createRandomBuddyGroup(users, date) {
    let category = rSelect(['pool', 'pool', 'openwater', 'openwater', 'openwater', 'classroom']);
    let startTime, endTime, owTime;
    if (['pool', 'classroom'].includes(category)) {
        let startIdx = randomInt(startTimes().length);
        let endIdx = startIdx + randomInt(endTimes().length - startIdx);
        startTime = startTimes()[startIdx];
        endTime = endTimes()[endIdx];
    } else {
        owTime = rSelect(['AM', 'AM', 'PM']);
    }

    let resType;
    if (category === 'classroom') {
        resType = 'course';
    } else {
        resType = rSelect(['autonomous', 'autonomous', 'autonomous', 'autonomous', 'course']);
    }

    let nBuddies = 1;
    // buddies disabled at the moment...
    if (resType === 'autonomous' && Math.random() > 1) {
        nBuddies += randomInt(4);
    }
    let buddyPool = [...Array(nBuddies).keys()].map(() => rSelect(users));
    buddyPool = Array.from(new Set(buddyPool));
    for (let i = users.length-1; i >= 0; i--) {
        for (let buddy of buddyPool) {
            if (buddy.id === users[i].id) {
                users.splice(i,1);
                break;
            }
        }
    }
    let rsvs = [];
    let buddyDepth = 20 + randomInt(70);
    for (let buddy of buddyPool) {
        let rsv = createRandomRsv(
            buddyPool,
            buddyDepth,
            { user: buddy.id, date, resType, category, startTime, endTime, owTime }
        );
        rsvs.push(rsv);
    }

    return rsvs;
}

export function createRandomRsvs(numPerDay, settings, users, buoys, daysRange) {
    let entries = [];
    for (let day=0; day < daysRange; day++) {
        let dt = minValidDate();
        dt.setDate(dt.getDate() + day);
        let date = datetimeToLocalDateStr(dt);
        let dayUsers = [...users];
        for (let i=0; i < numPerDay; i++) {
            let rsvs = createRandomBuddyGroup(dayUsers, date);
            for (let rsv of rsvs) {
                // assign temporary id
                rsv.id = faker.datatype.uuid();
                let result = checkSpaceAvailable(rsv, entries, buoys);
                if (result.status === 'success') {
                    delete rsv.id;
                    entries.push(rsv);
                }
            }
            if (dayUsers.length == 0) {
                break;
            }
        }
    }
    return entries;
}

export async function generateTestData() {
    let nPerDay = 40;
    let daysRange = 10;
    let settingsTbl = await xata.db.Settings.getAll();
    settings.set(parseSettingsTbl(settingsTbl));

    let buoys = await xata.db.Buoys.getAll();
    /*
    let nUser = 30;
    let newUsers = createRandomUsers(nUser);
    await xata.db.Users.create(newUsers);
    */
    let users = await xata.db.Users.getAll();

    let rsvs = createRandomRsvs(nPerDay, settings, users, buoys, daysRange);

    return {users, rsvs, buoys};
}

export async function writeTestDataToFile() {
    let { users, rsvs, buoys } = await generateTestData();
    let data = JSON.stringify({ users, rsvs, buoys });
    fs.writeFile('autoAssign-tests.json', data, (err) => {
        if (err) throw err;
        console.log('data written to file');
    });
}

export async function writeTestDataToDb() {
    let { rsvs } = await generateTestData();
    await xata.db.Reservations.create(rsvs);
}

//writeTestDataToDb();
