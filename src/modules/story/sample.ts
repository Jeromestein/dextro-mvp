import type { Story, Passage } from "@/modules/story/model";
const node = (
  id: string,
  title: string,
  text: string,
  choices: [string, string][] = [],
  ending = false,
): Passage => ({
  id,
  title,
  text,
  ending,
  image: "",
  choices: choices.map(([text, target], i) => ({
    id: `${id}-${i}`,
    text,
    target,
  })),
});
export function sampleStory(): Story {
  return {
    version: 1,
    id: "sample-last-light",
    title: "The Last Light",
    genre: "Mystery",
    description:
      "A rain-soaked inn. A letter with your name. And a lighthouse that should have gone dark years ago.",
    updatedAt: "2026-09-28T12:00:00.000Z",
    startId: "arrival",
    passages: [
      node(
        "arrival",
        "The arrival",
        "By the time you reach the Saltwater Inn, the road behind you has disappeared beneath the tide.\n\nInside, a fire burns low. There is no innkeeper, only a brass bell and an envelope with your name written in blue ink.\n\nAcross the bay, the abandoned lighthouse flashes three times.",
        [
          ["Open the envelope", "letter"],
          ["Ring the brass bell", "keeper"],
        ],
      ),
      node(
        "letter",
        "A familiar hand",
        "The handwriting belongs to your sister. She disappeared from this coast seven years ago.\n\n‘If the light is burning, there is still time. Take the lantern from the kitchen. Do not come across the causeway.’\n\nBelow her signature is a sketch of a small boat.",
        [
          ["Look for the boat", "boat"],
          ["Find the innkeeper first", "keeper"],
        ],
      ),
      node(
        "keeper",
        "The keeper",
        "A woman steps out of the kitchen, drying her hands. She does not seem surprised to see you.\n\n‘Your sister kept that light burning for strangers,’ she says. ‘Tonight, someone needs to keep it burning for her.’\n\nShe places a lantern on the counter and points to the jetty. Outside, you hear a cry from the flooded road.",
        [
          ["Take the lantern to the jetty", "boat"],
          ["Investigate the cry outside", "road"],
        ],
      ),
      node(
        "road",
        "The rising water",
        "A young traveler clings to the old road marker. His bicycle has already vanished under the water.\n\nThe lighthouse beam sweeps past. In its light you see a rope tied to the inn's gate.\n\nThere is time to pull him in, but not to cross the bay tonight.",
        [
          ["Throw him the rope", "shelter"],
          ["Call the innkeeper, then head to the jetty", "boat"],
        ],
      ),
      node(
        "boat",
        "Across the bay",
        "The little boat is exactly where the drawing said it would be. A lantern waits beneath its seat. You light it, and the wick catches with a warm orange glow.\n\nHalfway across, the lighthouse goes dark. You can barely make out the rocky shore.\n\nThen a small answering light appears at the landing.",
        [
          ["Follow the small light", "landing"],
          ["Turn back while the inn is visible", "shelter"],
        ],
      ),
      node(
        "landing",
        "The landing",
        "Your sister is waiting on the steps. Older, colder, unmistakably herself.\n\n‘There will be time for explanations,’ she says. ‘But a fishing boat is coming in. Help me with the lamp, or take me home.’\n\nAbove you, the great glass lens is still. Beyond it, a ship's horn sounds in the fog.",
        [
          ["Climb the tower together", "light"],
          ["Bring her back to the inn", "home"],
        ],
      ),
      node(
        "light",
        "A light for strangers",
        "Together you lift the lantern into the great lens. The room fills with gold.\n\nFar below, the fishing boat changes course. Three short blasts of its horn reach you through the rain.\n\nYour sister takes your hand. At dawn, you will have questions. Tonight, you have found each other.\n\nAnd for the first time in seven years, you watch the sunrise from the same shore.",
        [],
        true,
      ),
      node(
        "home",
        "The way home",
        "You guide your sister into the little boat. She keeps the lantern raised all the way across.\n\nAt the inn, the keeper sets out two bowls of soup without asking a question. The coastguard answers her call and guides the fishing boat into harbor.\n\nYour sister unfolds a map. ‘It is a long story,’ she says.\n\nYou pull your chair closer. ‘I have time.’",
        [],
        true,
      ),
      node(
        "shelter",
        "Until morning",
        "By midnight, everyone at the inn has gathered around the fire. You watch the dark water from the window.\n\nJust before dawn, a small boat appears at the jetty. A woman steps ashore, carrying an empty lantern.\n\nYou recognize her before she looks up.\n\nSome journeys end when you reach the destination. This one ends when you open the door.",
        [],
        true,
      ),
    ],
  };
}
