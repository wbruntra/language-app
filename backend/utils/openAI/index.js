const calculateCost = require('./calculateCost')
const createTextToSpeech = require('./createTextToSpeech')
const { analyzeVocabulary } = require('./analyzeVocabulary')
const tabooGameplay = require('./tabooGameplay')

module.exports = { createTextToSpeech, calculateCost, analyzeVocabulary, tabooGameplay }