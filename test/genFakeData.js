import { faker } from '@faker-js/faker';
import { XataClient } from '../src/lib/server/xata.codegen.server.js';
import { datetimeToLocalDateStr } from '../src/lib/datetimeUtils.js';
import { startTimes, endTimes, minValidDate } from '../src/lib/ReservationTimes.js';
import { settings } from '../src/lib/stores.js';
import { parseSettingsTbl } from '../src/lib/utils.js';
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

function createRandomRsv(buddyPool, rsv) {
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
    return {
        ...rsv,
        numStudents: rsv.resType === 'course' ? 1 + randomInt(4) : null,
        maxDepth: rsv.category === 'openwater' ? 20 + randomInt(90) : null,
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
        let endIdx = startIdx + 1 + randomInt(endTimes().length - startIdx - 1);
        startTime = startTimes()[startIdx];
        endTime = endTimes()[endIdx];
    } else {
        owTime = rSelect(['AM', 'AM', 'PM']);
    }

    let resType = rSelect(['autonomous', 'autonomous', 'autonomous', 'course']);
    let nBuddies = 1;
    if (resType === 'autonomous') {
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
    for (let buddy of buddyPool) {
        let rsv = createRandomRsv(
            buddyPool,
            { user: buddy.id, date, resType, category, startTime, endTime, owTime }
        );
        rsvs.push(rsv);
    }

    return rsvs;
}

export function createRandomRsvs(numPerDay, settings, users, daysRange) {
    let entries = [];
    for (let day=0; day < daysRange; day++) {
        let dt = minValidDate();
        dt.setDate(dt.getDate() + day);
        let date = datetimeToLocalDateStr(dt);
        let dayUsers = [...users];
        for (let i=0; i < numPerDay; i++) {
            let rsvs = createRandomBuddyGroup(dayUsers, date);
            entries.push(...rsvs);
            if (dayUsers.length == 0) {
                break;
            }
        }
    }
    return entries;
}

export async function generateTestData() {
    let nPerDay = 20;
    let daysRange = 10;
    let settingsTbl = await xata.db.Settings.getAll();
    settings.set(parseSettingsTbl(settingsTbl));

    let buoys = await xata.db.Buoys.getAll();
    /*
    let nUser = 20;
    let users = createRandomUsers(nUser);
    users = users.map((r) => {
        r.id = faker.datatype.uuid();
        return r;
    });
    */
    let users = await xata.db.Users.getAll();
    let rsvs = createRandomRsvs(nPerDay, settings, users, daysRange);
    rsvs = rsvs.map((rsv) => {
        rsv.id = faker.datatype.uuid();
        return rsv;
    });
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
    let { users, rsvs } = await generateTestData();
    //await xata.db.Users.create(users);
    await xata.db.Reservations.create(rsvs);
}

//writeTestDataToDb();
