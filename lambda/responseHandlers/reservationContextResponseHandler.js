"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSimilarRestaurants = void 0;
const localizationFeatures_1 = require("../utils/localizationFeatures");
const apiCalls_1 = require("../apiCalls");
const apiCalls_2 = require("../apiCalls");
const constants_1 = require("../shared/constants");
const dateTimeUtils_1 = require("../utils/dateTimeUtils");
const debugUtils_1 = require("../utils/debugUtils");
const { VALUE_MAP, CONTEXT_WEIGHT, NULL_DISTANCE_SCALING_FACTOR, DISTANCE_THRESHOLD } = constants_1.CONF;
/**
 * Searches for the restaurants that match better the user query, and gives a score to each one of them based on the distance from the query and the context.
 * @param handlerInput
 * @param slots
 * @returns
 */
const handleSimilarRestaurants = (handlerInput, slots) => __awaiter(void 0, void 0, void 0, function* () {
    const { restaurantName, location, date, time, numPeople, yesNo } = slots;
    let searchResults = [];
    const coordinates = (0, localizationFeatures_1.default)();
    if (!restaurantName || !date || !time || !numPeople) {
        //Ask for the data that's missing before disambiguation
        return handlerInput.responseBuilder.addDelegateDirective().getResponse();
    }
    if (coordinates) {
        const locationInfo = { location: coordinates, maxDistance: 40000 };
        searchResults = yield (0, apiCalls_1.searchRestaurants)(restaurantName, locationInfo);
    }
    else {
        searchResults = yield (0, apiCalls_1.searchRestaurants)(restaurantName, undefined, location !== null && location !== void 0 ? location : 'Rome');
    }
    let plausibleContexts = [];
    //Examine the search results
    for (let result of searchResults) {
        if (result.nameDistance > DISTANCE_THRESHOLD)
            continue;
        const { id } = result.restaurant;
        const { weekday: currentDay, hour: currentHour, minute: currentMinute } = (0, dateTimeUtils_1.getDateComponentsFromDate)();
        const currentTime = (0, dateTimeUtils_1.parseTime)(currentHour, currentMinute);
        const reservationDateTime = (0, dateTimeUtils_1.convertAmazonDateTime)(date, time);
        const reservationDateComponents = (0, dateTimeUtils_1.getDateComponentsFromDate)(reservationDateTime);
        const { weekday: reservationDay, hour: reservationHour, minute: reservationMinute } = reservationDateComponents;
        const reservationTime = (0, dateTimeUtils_1.parseTime)(reservationHour, reservationMinute);
        const context = {
            id_restaurant: id,
            n_people: parseInt(numPeople),
            reservationLocation: constants_1.TEST_LATLNG,
            currentDay,
            reservationDay,
            currentTime,
            reservationTime,
        };
        const contextDistance = yield (0, apiCalls_2.getDistanceFromContext)(context);
        plausibleContexts.push({
            restaurant: result.restaurant,
            contextDistance: contextDistance,
            nameDistance: result.nameDistance,
        });
    }
    console.log((0, debugUtils_1.beautify)(plausibleContexts)); //TODO: debug
    let scores = [];
    for (let context of plausibleContexts) {
        //TODO: For debug reasons I inserted also nameDistance and contextDistance, this have to be removed later.
        scores.push({
            restaurant: context.restaurant,
            // nameDistance: context.nameDistance,
            // contextDistance: context.contextDistance,
            score: computeAggregateScore(context),
        });
    }
    scores.sort((a, b) => b.score - a.score);
    //Examine the plausible restaurants
    console.log(`DEBUG SCORES: ${(0, debugUtils_1.beautify)(scores)}`); //TODO: debug
    const handleResult = handleScores(scores);
    if (!handleResult) {
        return handlerInput.responseBuilder.speak(`No restaurant matches the query`).getResponse();
    }
    if ('field' in handleResult && 'variance' in handleResult) {
        const { field, variance } = handleResult;
        return handlerInput.responseBuilder
            .speak(`I examined the results, the restaurants can be disambiguated via the ${field} property, that has a variance of ${variance}`)
            .getResponse();
    }
    else {
        const { restaurant, score } = handleResult;
        return handlerInput.responseBuilder
            .speak(`I examined the results, I think the restaurant you mean is ${restaurant.name}, which has a score of ${score}`)
            .getResponse();
    }
});
exports.handleSimilarRestaurants = handleSimilarRestaurants;
/**
 * Computes the aggregate score between the contextDistance and the nameDistance. The higher the score, the better.
 * @param context
 * @returns
 */
const computeAggregateScore = (context) => {
    const { contextDistance, nameDistance } = context;
    if (contextDistance == null) {
        //TODO: There is a problem with this, because if each restaurant has the distance == null, the nameDistance score gets too distorted
        const minNameDistance = Math.max(nameDistance, 0.05); // The name distance won't ever be 0 because of floats, so it has to be increased a little bit for the scaling to work
        return 1 - Math.min(Math.pow(minNameDistance, NULL_DISTANCE_SCALING_FACTOR), 1);
    }
    const normalizedContextDistance = normalizeContext(contextDistance);
    const avg = (1 - CONTEXT_WEIGHT) * nameDistance + CONTEXT_WEIGHT * normalizedContextDistance;
    return 1 - avg;
};
/**
 * Normalizes the inputValue according to the valueMap distribution, interpolating the values in between.
 * @param inputValue
 * @returns
 */
const normalizeContext = (inputValue) => {
    // Sort the input values
    const sortedValues = VALUE_MAP.map(([inputValue]) => inputValue).sort((a, b) => a - b);
    // Find the index of inputValue in the sorted list
    const index = sortedValues.findIndex(value => inputValue <= value);
    if (index === 0) {
        // If inputValue is less than the smallest value in the list, return the normalized value of the smallest value
        return VALUE_MAP[0][1];
    }
    else if (index === -1) {
        // If inputValue is greater than the largest value in the list, return the normalized value of the largest value
        return VALUE_MAP[VALUE_MAP.length - 1][1];
    }
    else {
        // Interpolate between the normalized values based on the index
        const [prevValue, prevNormalizedValue] = VALUE_MAP[index - 1];
        const [nextValue, nextNormalizedValue] = VALUE_MAP[index];
        const t = (inputValue - prevValue) / (nextValue - prevValue);
        return prevNormalizedValue + (nextNormalizedValue - prevNormalizedValue) * t;
    }
};
const handleScores = (items) => {
    const { SCORE_THRESHOLDS } = constants_1.CONF;
    let highChoices = [];
    let mediumChoices = [];
    let lowChoices = [];
    const { high, medium, low } = SCORE_THRESHOLDS;
    for (let item of items) {
        const { score } = item;
        if (score >= high)
            highChoices.push(item);
        if (medium <= score && score < high)
            mediumChoices.push(item);
        if (low <= score && score < medium)
            lowChoices.push(item);
    }
    if (highChoices.length > 0) {
        console.log(`CHOICES_DEBUG: Inside high choices with length of ${highChoices.length}. The object is ${(0, debugUtils_1.beautify)(highChoices)}`);
        const fieldAndVariance = computeHighestVariance(highChoices);
        if (fieldAndVariance) {
            return fieldAndVariance;
        }
        return highChoices[0]; //If variance is null, then it means that there is only an element
    }
    if (mediumChoices.length > 0) {
        //TODO: Change this, for now it's just a copy of the highChoices
        console.log(`CHOICES_DEBUG: Inside medium choices with length of ${mediumChoices.length}. The object is ${(0, debugUtils_1.beautify)(mediumChoices)}`);
        const fieldAndVariance = computeHighestVariance(mediumChoices);
        if (fieldAndVariance) {
            return fieldAndVariance;
        }
        return mediumChoices[0]; //If variance is null, then it means that there is only an element
    }
    if (lowChoices.length > 0) {
        //TODO: Change this, for now it's just a copy of the highChoices
        console.log(`CHOICES_DEBUG: Inside low choices with length of ${lowChoices.length}. The object is ${(0, debugUtils_1.beautify)(lowChoices)}`);
        const fieldAndVariance = computeHighestVariance(lowChoices);
        if (fieldAndVariance) {
            return fieldAndVariance;
        }
        return lowChoices[0]; //If variance is null, then it means that there is only an element
    }
    return null;
};
const computeHighestVariance = (items) => {
    if (items.length <= 1)
        return null;
    let allLatLng = [];
    let allCities = [];
    let allCuisines = [];
    let allAvgRating = [];
    for (let { restaurant, score } of items) {
        const { latitude, longitude, city, cuisines, avgRating } = restaurant;
        allLatLng.push({ latitude, longitude });
        allCities.push([city]);
        allCuisines.push(cuisines.split(',').map(item => item.trim()));
        allAvgRating.push(avgRating);
    }
    console.log(`DEBUG DATA: ${(0, debugUtils_1.beautify)({
        allLatLng: allLatLng,
        allCities: allCities,
        allCuisines: allCuisines,
        allAvgRating: allAvgRating,
    })}`);
    const variances = {
        latLng: computeLatLngVariance(allLatLng),
        city: computeStringArrayVariance(allCities),
        cuisine: computeStringArrayVariance(allCuisines),
        avgRating: computeSimpleVariance(allAvgRating),
    };
    console.log(`DEBUG VARIANCES (before normalization): ${(0, debugUtils_1.beautify)(variances)}`);
    const normalizedVariances = normalizeVariances(variances);
    console.log(`DEBUG NORMALIZED VARIANCES: ${(0, debugUtils_1.beautify)(normalizedVariances)}`);
    const [maxPropertyName, maxValue] = Object.entries(normalizedVariances).reduce((acc, [property, value]) => (value > acc[1] ? [property, value] : acc), ['', -Infinity]);
    return { field: maxPropertyName, variance: maxValue };
};
const computeSimpleVariance = (values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
    const sumOfSquaredDifferences = squaredDifferences.reduce((sum, difference) => sum + difference, 0);
    const variance = sumOfSquaredDifferences / values.length;
    const standardDeviation = Math.sqrt(variance);
    return { mean, std: standardDeviation, variance };
};
const computeLatLngVariance = (values) => {
    // Calculate the average latitude and longitude
    const sumLatitude = values.reduce((sum, { latitude }) => sum + latitude, 0);
    const sumLongitude = values.reduce((sum, { longitude }) => sum + longitude, 0);
    const avgLatitude = sumLatitude / values.length;
    const avgLongitude = sumLongitude / values.length;
    // Calculate the sum of squared distances
    const sumSquaredDistances = values.reduce((sum, { latitude, longitude }) => {
        const distance = (0, localizationFeatures_1.distanceBetweenCoordinates)({ latitude, longitude }, { latitude: avgLatitude, longitude: avgLongitude });
        return sum + distance * distance;
    }, 0);
    // Calculate the sum of distances
    const mean = values.reduce((sum, { latitude, longitude }) => {
        const distance = (0, localizationFeatures_1.distanceBetweenCoordinates)({ latitude, longitude }, { latitude: avgLatitude, longitude: avgLongitude });
        return sum + distance;
    }, 0) / values.length;
    const variance = sumSquaredDistances / (values.length - 1);
    const standardDeviation = Math.sqrt(variance);
    return { mean, std: standardDeviation, variance };
};
const computeStringArrayVariance = (values) => {
    const countUniqueStrings = (arr) => {
        const uniqueStrings = new Set(arr);
        return uniqueStrings.size;
    };
    // Calculate the average count of different strings
    const sumCounts = values.reduce((sum, arr) => sum + countUniqueStrings(arr), 0);
    const avgCount = sumCounts / values.length;
    // Calculate the sum of squared differences from the average count
    const sumSquaredDifferences = values.reduce((sum, arr) => {
        const difference = countUniqueStrings(arr) - avgCount;
        return sum + difference * difference;
    }, 0);
    const mean = values.reduce((sum, arr) => {
        const difference = countUniqueStrings(arr) - avgCount;
        return sum + difference * difference;
    }, 0) / values.length;
    // Calculate the variance
    const variance = sumSquaredDifferences / (values.length - 1);
    const standardDeviation = Math.sqrt(variance);
    return { mean, std: standardDeviation, variance };
};
const normalizeVariances = (variances) => {
    let { latLng, city, cuisine, avgRating } = variances;
    latLng = latLng;
    city = city;
    cuisine = cuisine;
    avgRating = avgRating;
    const zScore = (item) => {
        return (item.variance - item.mean) / item.std;
    };
    return {
        latLng: zScore(latLng),
        city: zScore(city),
        cuisine: zScore(cuisine),
        avgRating: zScore(avgRating),
    };
};