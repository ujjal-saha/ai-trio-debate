// ---------------------------------------------------------------------------
// debate.js  -  the pre-written messages used by the Debate button.
// Edit the wording here if you want a different style of debate.
//
// How a debate runs (N = the "rounds" number you pick in the popup):
//   step 0        opening statements   (topic + explanation of the debate)
//   steps 1..N    back-and-forth       (each AI gets the other two's replies)
//   step N+1      final conclusions    (last replies + "come to a conclusion")
// ---------------------------------------------------------------------------

var DEBATE_WORDS = 250;          // asks each AI to keep replies around this long
var DEBATE_STABLE_MS = 6000;     // wait longer before deciding a reply is finished

function debateStepLabel(step, rounds) {
  if (step === 0) return 'Opening statements';
  if (step > rounds) return 'Final conclusions';
  return 'Round ' + step + ' of ' + rounds;
}

function debateOthers(me) {
  return SITE_ORDER.filter(function (id) { return id !== me; });
}

// Builds:  Gemini replied: """ ... """   ChatGPT replied: """ ... """
function debateOthersBlock(me, replies) {
  return debateOthers(me).map(function (id) {
    return SITES[id].name + ' replied:\n"""\n' + replies[id] + '\n"""';
  }).join('\n\n');
}

function debateOpening(topic, me) {
  var o = debateOthers(me).map(function (id) { return SITES[id].name; });
  return [
    'You are about to take part in a three-way debate between three AI assistants: Claude, Gemini and ChatGPT. You are ' + SITES[me].name + '. The other two debaters are ' + o[0] + ' and ' + o[1] + '.',
    '',
    'Topic: ' + topic,
    '',
    'How it works:',
    '1. Right now, give your opening position on the topic. Be clear, specific and honest, and give your strongest reasons. Keep it under ' + DEBATE_WORDS + ' words.',
    '2. In the next rounds I will paste in what the other two said. Reply to them directly: say what you agree with, challenge what you think is wrong, and change your mind if they make a good point. Do not just repeat yourself.',
    '3. At the end I will ask each of you for a final conclusion.',
    '',
    'Give your opening position now.'
  ].join('\n');
}

function debateExchange(topic, me, replies, round, rounds) {
  return [
    'Round ' + round + ' of ' + rounds + '. Here is what the other two debaters said in the last round.',
    '',
    debateOthersBlock(me, replies),
    '',
    'Now respond to both of them directly. Say where they are right, where they are wrong and why, and change your view if a good point convinces you. Keep it under ' + DEBATE_WORDS + ' words.'
  ].join('\n');
}

function debateFinal(topic, me, replies) {
  return [
    'Final round. Here are the latest replies from the other two debaters.',
    '',
    debateOthersBlock(me, replies),
    '',
    'The debate is now over. Give your final conclusion on "' + topic + '". State your final position, say what changed your mind (if anything), name any points that are still in disagreement, and finish with a clear bottom-line answer the user can act on. Keep it under ' + DEBATE_WORDS + ' words.'
  ].join('\n');
}
