"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJob = void 0;
const lodash_1 = require("lodash");
const log = console.log.bind(console);
const PROTEINS = 'carnitas brisket camarones pescado'.split(' ');
const SALSAS = 'habanero chipotle tomatillo mole'.split(' ');
function chooseProtein() {
    return lodash_1.sample(PROTEINS);
}
function chooseSalsa() {
    return lodash_1.sample(SALSAS);
}
function createJob(queue, orderNumber) {
    const protein = chooseProtein();
    const salsa = chooseSalsa();
    log(`${queue.name}: ordering #${orderNumber} ${protein}, ${salsa}`);
    return queue.add('tacos', { protein, salsa, orderNumber, queue: queue.name });
}
exports.createJob = createJob;
