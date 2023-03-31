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
    let resType = rSelect(['autonomous', 'autonomous', 'autonomous', 'course']);
    let buddies = {
        id: [],
        name: []
    };
    if (resType === 'autonomous') {
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
        resType,
        numStudents: resType === 'course' ? 1 + randomInt(4) : null,
        maxDepth: rsv.category === 'openwater' ? 20 + randomInt(90) : null,
        comments: faker.lorem.lines(1),
        status: 'pending',
        owner: true,
        buddies,
    };
}

function createRandomBuddyGroup(users, daysRange) {
    let dt = minValidDate();
    dt.setDate(dt.getDate() + randomInt(daysRange));
    let date = datetimeToLocalDateStr(dt);

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

    let nBuddies = 1 + randomInt(4);
    let buddyPool = [...Array(nBuddies).keys()].map(() => rSelect(users));
    buddyPool = Array.from(new Set(buddyPool));
    let rsvs = [];
    for (let buddy of buddyPool) {
        let rsv = createRandomRsv(
            buddyPool,
            { user: buddy.id, date, category, startTime, endTime, owTime }
        );
        rsvs.push(rsv);
    }

    return rsvs;
}

export function createRandomRsvs(N, settings, users, daysRange) {
    let entries = [];
    for (let i=0; i<N; i++) {
        let rsvs = createRandomBuddyGroup(users, daysRange);
        entries.push(...rsvs);
    }
    return entries;
}

export async function generateTestData() {
    let nRsv = 100;
    let nUser = 10;
    let daysRange = 10;
    let settingsTbl = await xata.db.Settings.getAll();
    settings.set(parseSettingsTbl(settingsTbl));

    let buoys = await xata.db.Buoys.getAll();
    let users = createRandomUsers(nUser);
    users = users.map((r) => {
        r.id = faker.datatype.uuid();
        return r;
    });
    let rsvs = createRandomRsvs(nRsv, settings, users, daysRange);
    rsvs = rsvs.map((rsv) => {
        rsv.id = faker.datatype.uuid();
        return rsv;
    });
    let data = JSON.stringify({ users, rsvs, buoys });
    fs.writeFile('autoAssign-tests.json', data, (err) => {
        if (err) throw err;
        console.log('data written to file');
    });
}

async function addRsvsToDB(N) {
    let settingsTbl = await xata.db.Settings.getAll();
    settings.set(parseSettingsTbl(settingsTbl));
    let users = await xata.db.Users
        .filter({ status: 'active' })
        .getAll();
    let entries = createRandomRsvs(N, settings, users);
    await xata.db.Reservations.create(entries);
}

generateTestData();
