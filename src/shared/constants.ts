import { LatLng } from './types'

// Coordinates to test the localization features
// export const TEST_LATLNG: LatLng = { latitude: 41.909734, longitude: 12.349999 } //Standard coordinates
// export const TEST_LATLNG: LatLng = { latitude: 41.90083485186245, longitude: 12.5160087189505 } //Coordinates near lab paolo ercoli
export const TEST_LATLNG: LatLng = { latitude: 41.713497, longitude: 12.444199 } //Coordinates near roadhouse

// Coordinates of Rome

export const ROME_LATLNG: LatLng = { latitude: 41.9029, longitude: 12.47959 }
export const MAX_DISTANCE: number = 50000

// Change this if you want to enable the localization. Remember that coordinates are constants.
export const LOCALIZATION_ENABLED: boolean = true

// ID of the user
export const USER_ID = 1

//TODO: Insert here thresholds and weights configuration for taking decisions
/**
 * Configuration file for parameters.
 *
 * - DISTANCE_THRESHOLD [0,1]: The minimum distance that a restaurant has to have from the query in order to be considered;
 *
 * - CONTEXT_SOFT_THRESHOLD [CONTEXT_SOFT_THRESHOLD, +inf]: _NOT USED_
 *
 * - CONTEXT_HARD_THRESHOLD: [0, CONTEXT_SOFT_THRESHOLD]: _NOT USED_
 *
 * - CONTEXT_WEIGHT [0,1]: The weight of the context part for the average between the context distance and the name distance;
 *
 * - NULL_DISTANCE_SCALING_FACTOR [0,1]: The importance that is given to a restaurant with a contextDistance == null. The lower this value, the lower the final score;
 *
 * - VALUE_MAP: The distribution of how the contextDistance has to be normalized. Values in between are linearly interpolated;
 *
 * - SCORE_THRESHOLDS: The thresholds that manage the separation of the restaurants in the three buckets depending on the score;
 *
 * - LOCATION_BOOST_FACTOR: The amount of boost to give to a restaurant score depending on the proximity with the current coordinates. (The higher, the stronger the boost).
 *   The value should be from 0 (no boost) to 1 (only location is considered for the score);
 */
export const CONF = {
    DISTANCE_THRESHOLD: 0.9,
    CONTEXT_SOFT_THRESHOLD: 2,
    CONTEXT_HARD_THRESHOLD: 0.5,
    CONTEXT_WEIGHT: 0.8, //TODO: 0.8 seems fine, but maybe it's too high
    NULL_DISTANCE_SCALING_FACTOR: 0.5,
    VALUE_MAP: [
        [0, 0],
        [0.1, 0.01],
        [0.2, 0.05],
        [0.3, 0.1],
        [0.5, 0.3],
        [1, 0.4],
        [2, 0.5],
        [3, 0.6],
        [20, 0.8],
        [100, 1],
    ],
    SCORE_THRESHOLDS: {
        high: 0.6,
        medium: 0.4,
        low: 0.1,
    },
    LOCATION_BOOST_FACTOR: 0.2,
}
