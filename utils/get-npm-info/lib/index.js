'use strict';

const axios = require('axios').default;
// const semver = require('semver');
const urlJoin = require('url-join');

function getNpmInfo(npmName, registry = getDefaultRegistry()) {
    if (!npmName) {
        return null;
    }
    const npmInfoUrl = urlJoin(registry, npmName);
    return axios.get(npmInfoUrl).then(res => {
        if (res.status === 200) {
            return res.data;
        }
        return null;
    }).catch(error => {
        return Promise.reject(error)
    })
}

async function getNpmVersions(npmName, registry) {
    const data = await getNpmInfo(npmName, registry);
    if (!data) {
        return []
    }
    return Object.keys(data.versions)
}

// function getSemverVersions (baseVersion, versions) {
//     return versions
//         .filter(version => semver.satisfies(version, `^${baseVersion}`))
//         .sort((a, b) => semver.gt(b, a) ? 1 : -1);
// }

// async function getNpmSemveVersion (baseVersion, npmName, registry) {
//     const versions = await getNpmVersions(npmName, registry);
//     const newVersions = getNpmSemverVersions(baseVersion, versions);
//     if (newVersions && newVersions.length > 0) {
//         return newVersions[0];
//     }
// }

async function getNpmLatestVersion (npmName, registry) {
    const data = await getNpmInfo(npmName, registry);
    if (data?.['dist-tags']?.latest) {
        return data['dist-tags'].latest;
    }
    return null;
}

function getDefaultRegistry(isOriginal = false) {
    return !isOriginal ? 'https://registry.npmmirror.com' : 'https://registry.npmjs.org'
}

module.exports = {
    getNpmInfo,
    getNpmVersions,
    // getSemverVersions,
    // getNpmSemveVersion,
    getDefaultRegistry,
    getNpmLatestVersion
}
