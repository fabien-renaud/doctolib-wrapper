const axios = require('axios');
const {JSDOM} = require('jsdom');

const header = 'Nom;Numéro de téléphone;Email;Ville';
const job = 'sophrologue';
// const cities = ['Angers', 'Dijon', 'Groble', 'Le havre', 'Saint Etienne', 'Toulon Reims', 'Rennes', 'Lille', 'Bordeaux', 'Strasbourg', 'Montpellier', 'Nantes', 'Nice', 'Toulouse', 'Lyon', 'Paris'];
const cities = ['Nantes'];

const baseUrl = 'https://www.doctolib.fr';
const searchUrl = (job, city, page) => `${baseUrl}/${job}/${city}?page=${page}`;

const querySelector = (dom, selector) => dom.window.document.querySelector(selector);
const querySelectorAll = (dom, selector) => [...dom.window.document.querySelectorAll(selector)];

const getDom = async (url, callback) => {
    const {status, data} = await axios.get(url);
    if (status !== 200 || !data) throw new Error('This page does not exists');
    const dom = new JSDOM(data);
    return callback(dom);
};

const getPracticianUrls = (url) => getDom(url, (dom) => {
    return querySelectorAll(dom, '.dl-search-result-name').map(element => `${baseUrl}${element.href}`);
});

const getPracticianInformations = (url) => getDom(url, (dom) => {
    const name = querySelector(dom, '.dl-profile-header-name').textContent;
    const speciality = querySelector(dom, '.dl-profile-header-speciality').textContent;
    const phoneNumber = querySelector(dom, '.dl-profile-box .dl-display-flex').textContent;
    return {name, speciality, phoneNumber};
});

(() => {
    const csv = cities.map(city => city.toLowerCase()).reduce(async (csv, city) => {
        for (let page = 1; page < 2; page++) {
            const url = searchUrl(job, city, page);
            const practicianUrls = await getPracticianUrls(url);
            const practicianInformations = await Promise.all([...practicianUrls[0]].map(await getPracticianInformations));
            console.log(practicianInformations);
        }
    }, header);
    // console.log(csv);
})();