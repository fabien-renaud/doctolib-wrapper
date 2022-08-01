const axios = require('axios');
const {JSDOM} = require('jsdom');
const https = require('https');
const {Promise} = require('bluebird');

const header = 'Nom;Métier;Numéro de téléphone;Ville\r\n';
const job = 'sophrologue';
const cities = ['Angers', 'Dijon', 'Grenoble', 'Le-havre', 'Saint-Etienne', 'Toulon', 'Reims', 'Rennes', 'Lille', 'Bordeaux', 'Strasbourg', 'Montpellier', 'Nantes', 'Nice', 'Toulouse', 'Lyon', 'Paris'];
// const cities = ['Nantes'];

const baseUrl = 'https://www.doctolib.fr';
const searchUrl = (job, city, page) => `${baseUrl}/${job}/${city}?page=${page}`;

const querySelector = (dom, selector) => dom?.window?.document?.querySelector(selector);
const querySelectorAll = (dom, selector) => [...dom?.window?.document?.querySelectorAll(selector)];

const getDom = async (url, callback) => {
    const {status, data} = await axios.get(url).then((result) => result).catch((error) => ({status: error.response?.status}));
    if (status === 404) return [];
    if (status === 403) throw new Error('403 Unauthorized');
    if (status !== 200 || !data) throw new Error('This page does not exists');
    const dom = new JSDOM(data);
    return callback(dom);
};

const getPracticianUrls = (url) => getDom(url, (dom) => {
    return querySelectorAll(dom, '.dl-search-result-name').map(element => `${baseUrl}${element.href}`);
});

const getPracticianInformations = (url) => getDom(url, (dom) => {
    const name = querySelector(dom, '.dl-profile-header-name')?.textContent ?? '';
    const speciality = querySelector(dom, '.dl-profile-header-speciality')?.textContent ?? '';
    const phoneNumber = querySelector(dom, '.dl-profile-box .dl-display-flex')?.textContent ?? '';
    return {name, speciality, phoneNumber};
});

(async () => {
    console.time('csv');
    const csv = await cities.map(city => city.toLowerCase()).reduce(async (rows, city) => {
        console.time(city);
        const searchUrls = [1, 2, 3, 4, 5].map((page) => searchUrl(job, city, page));
        const practicianUrls = await Promise.map(searchUrls, getPracticianUrls, {concurrency: 1});
        const practicianInformations = await Promise.map(practicianUrls.flat(), getPracticianInformations, {concurrency: 1});
        console.timeEnd(city);
        return await rows + practicianInformations.reduce((row, {name, speciality, phoneNumber}) => row + [name, speciality, phoneNumber, city].join(';') + '\r\n', '');
    }, Promise.resolve(header));
    console.timeEnd('csv');
    console.log(csv);
})();
