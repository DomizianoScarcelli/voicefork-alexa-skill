const Alexa = require("ask-sdk-core")
const { format } = require("date-fns")

const StartedMakeReservationIntentHandler = {
	canHandle(handlerInput) {
		const { dialogState, type } = handlerInput.requestEnvelope.request
		const { name } = handlerInput.requestEnvelope.request.intent
		return type === "IntentRequest" && name === "MakeReservationIntent" && dialogState === "STARTED"
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent
		return handlerInput.responseBuilder.speak("Starting_2,").reprompt("Again starting, ").addDelegateDirective(currentIntent).getResponse()
	},
}

const InProgressMakeReservationIntentHandler = {
	canHandle(handlerInput) {
		const { dialogState, type } = handlerInput.requestEnvelope.request
		const { name } = handlerInput.requestEnvelope.request.intent
		return type === "IntentRequest" && name === "MakeReservationIntent" && dialogState === "IN_PROGRESS"
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent
		return handlerInput.responseBuilder.speak("In progress,").reprompt("Again in progress, ").addDelegateDirective(currentIntent).getResponse()
	},
}

const VerifyRestaurantNameReservationHandler = {
	canHandle(handlerInput) {
		// const { dialogState, type } = handlerInput.requestEnvelope.request
		// const { name } = handlerInput.requestEnvelope.request.intent
		// let restaurantName
		// if (type === "IntentRequest") restaurantName = handlerInput.requestEnvelope.request?.intent?.slots?.restaurantName
		// return type === "IntentRequest" && name === "MakeReservationIntent" && restaurantName !== undefined
		return (
			handlerInput.requestEnvelope.request.type === "IntentRequest" &&
			handlerInput.requestEnvelope.request.intent.name === "MakeReservationIntent" &&
			handlerInput.requestEnvelope.request.intent.slots.restaurantName.value
		)
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent
		const { restaurantName } = currentIntent.slots
		if (restaurantName.value == "marione") return handlerInput.responseBuilder.speak("Ok, marioneeeee").addDelegateDirective(currentIntent).getResponse()

		return handlerInput.responseBuilder
			.speak("The restaurant name is not valid (you have to say marione!) What is the name of the place?")
			.addElicitSlotDirective("restaurantName", currentIntent)
			.getResponse()
	},
}

const CompletedMakeReservationIntentHandler = {
	canHandle(handlerInput) {
		const { dialogState, type } = handlerInput.requestEnvelope.request
		const { name } = handlerInput.requestEnvelope.request.intent
		return type === "IntentRequest" && name === "MakeReservationIntent" && dialogState === "COMPLETED"
	},
	handle(handlerInput) {
		const speakOutput = "Reservation completed."
		return handlerInput.responseBuilder.speak(speakOutput).withShouldEndSession(true).getResponse()
	},
}

module.exports = {
	StartedMakeReservationIntentHandler,
	InProgressMakeReservationIntentHandler,
	VerifyRestaurantNameReservationHandler,
	CompletedMakeReservationIntentHandler,
}
