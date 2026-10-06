> Historical meeting material. Proposals and unanswered checklist items are not confirmed scope. See [current requirements](../PROJECT_REQUIREMENTS.md).

# Ryan Meeting Decision Checklist

**Meeting date:** ____________________\
**Participants:** ____________________\

Use this checklist to record the decisions made during the meeting. Select one option unless the section says **select all that apply**.

## 1. What Product Are We Building?

- [ ] A branching-story design tool like Twine or Arcweave
- [ ] A no-code game engine like GDevelop or Construct
- [ ] An AI platform that generates complete games like Rosebud AI
- [ ] A hybrid platform: Canvas for design, assets from approved sources, and an AI coding agent for final generation **(Recommended)**
- [ ] Other: ________________________________________________

**Notes:**\
__________________________________________________________________\
__________________________________________________________________

## 2. What Quality Level Should the Games Reach?

- [ ] Basic text, white background, and choice buttons
- [ ] Polished interactive story with custom images and styling
- [ ] A Spending Spree-level 2D web game with custom UI, scoring, progress, audio, and animation **(Recommended for the first target)**
- [ ] Advanced 2D commercial-quality game
- [ ] 3D game with animated characters and environments
- [ ] Other/reference game: ___________________________________

**Examples Ryan considers successful:**\
1. ______________________________________________________________\
2. ______________________________________________________________\
3. ______________________________________________________________

## 3. What Should the First MVP Support?

### Game type — select one

- [ ] Spending Spree-style simulation **(Recommended)**
- [ ] Quiz or trivia game
- [ ] Branching interactive story
- [ ] Educational or training scenario
- [ ] Multiple game types from the first release
- [ ] Other: ________________________________________________

### MVP features — select all that apply

- [ ] 2D HTML5 web game
- [ ] Budget, score, or progress system
- [ ] Choice-based branching
- [ ] Custom backgrounds and images
- [ ] Character sprites
- [ ] Basic animation
- [ ] Background music
- [ ] Sound effects
- [ ] Voice-over
- [ ] Video
- [ ] Mobile and desktop layouts
- [ ] Hosted playable link
- [ ] Downloadable HTML package
- [ ] Downloadable source code

**Features postponed until later:**\
__________________________________________________________________

## 4. How Should the Platform Handle Assets?

### Asset sources — select all that apply

- [ ] Platform-owned or properly licensed asset library
- [ ] User-uploaded assets with ownership confirmation
- [ ] Approved AI image-generation service
- [ ] Approved AI music and sound-generation service
- [ ] Approved AI voice-generation service
- [ ] Approved AI 3D-generation service
- [ ] A hybrid of the options above **(Recommended)**
- [ ] Allow the AI agent to search the open internet for assets **(Not recommended)**

### Asset responsibilities

- [ ] Record the source and license for every asset
- [ ] Require users to confirm they have upload rights
- [ ] Establish a copyright complaint and removal process
- [ ] Review the commercial-use terms of every AI asset provider
- [ ] Define who owns AI-generated assets
- [ ] Add content moderation for uploaded and generated assets

**Preferred asset approach:**\
__________________________________________________________________\
__________________________________________________________________

## 5. What Is the Role of the Canvas?

- [ ] The Canvas itself produces the final playable game
- [ ] The Canvas only designs story structure and branching
- [ ] The Canvas generates a structured Game Specification for a coding agent **(Recommended)**
- [ ] The Canvas supports simple games directly and sends advanced games to a coding agent
- [ ] Other: ________________________________________________

### Information the Canvas should capture — select all that apply

- [ ] Scenes and branching paths
- [ ] Game rules and variables
- [ ] Score, budget, inventory, or progress
- [ ] Characters and locations
- [ ] Visual style
- [ ] Required images and animation
- [ ] Music, sound, and voice requirements
- [ ] Winning and losing conditions
- [ ] Target device and screen orientation

## 6. How Should AI Generation Work?

- [ ] Generate the entire game once with no further editing
- [ ] Generate, preview, and regenerate the entire game
- [ ] Generate, preview, and request targeted changes in natural language **(Recommended)**
- [ ] Let users edit through both the Canvas and natural-language instructions

### Generation controls — select all that apply

- [ ] Run coding agents in isolated backend environments
- [ ] Set time, network, storage, and cost limits
- [ ] Preserve previous versions
- [ ] Allow users to restore an earlier version
- [ ] Run automatic security and quality checks
- [ ] Require user approval before publishing

**Preferred coding agent or model:** ______________________________

## 7. How Should Games Be Published?

- [ ] Private preview only
- [ ] Public hosted link after user approval **(Recommended)**
- [ ] Automatic public publishing immediately after generation
- [ ] Downloadable standalone HTML package
- [ ] Downloadable project and source code
- [ ] Mobile app export
- [ ] Desktop app export
- [ ] Other: ________________________________________________

**Who maintains hosted games?**\
- [ ] The platform
- [ ] The user
- [ ] Shared responsibility
- [ ] To be determined

## 8. Who Owns the Final Game and Its Content?

- [ ] The user owns the final game and uploaded content
- [ ] The platform owns the generated game
- [ ] The user owns game content, while the platform retains ownership of templates and platform technology **(Recommended starting point)**
- [ ] Ownership depends on the subscription plan
- [ ] Legal review is required before deciding

**Additional licensing or ownership notes:**\
__________________________________________________________________\
__________________________________________________________________

## 9. What Business and Cost Model Should We Use?

- [ ] Free prototype with paid publishing
- [ ] Monthly subscription
- [ ] Credit-based generation
- [ ] Pay per generated game
- [ ] Subscription plus generation credits
- [ ] Enterprise or education licensing
- [ ] To be determined after measuring generation costs

### Costs to include — select all that apply

- [ ] LLM or coding-agent usage
- [ ] Image generation
- [ ] Music, sound, and voice generation
- [ ] Video or 3D generation
- [ ] Backend sandbox compute
- [ ] Storage and hosting
- [ ] Failed generation attempts
- [ ] Security, moderation, and quality assurance
- [ ] Ongoing maintenance and support

**Acceptable cost per generated game:** ___________________________

## 10. How Will We Define MVP Success?

- [ ] A user can create a complete game without writing code
- [ ] The result reaches the agreed Spending Spree quality level
- [ ] The complete Canvas-to-game workflow works reliably
- [ ] Assets have clear sources and commercial-use rights
- [ ] The game works on desktop and mobile
- [ ] Users can request changes without starting over
- [ ] Games can be previewed and published safely
- [ ] The average generation cost stays below: __________________
- [ ] The average generation time stays below: __________________
- [ ] Successful pilot with ______ users creating ______ games

## Final Decisions

- [ ] Product category confirmed
- [ ] Target quality confirmed
- [ ] First game type confirmed
- [ ] MVP features confirmed
- [ ] Asset strategy confirmed
- [ ] Canvas and coding-agent responsibilities confirmed
- [ ] Publishing approach confirmed
- [ ] Ownership and copyright approach confirmed
- [ ] Cost model confirmed or assigned for further research
- [ ] Next deliverable and owner confirmed

**Next deliverable:** _____________________________________________\
**Owner:** _______________________________________________________\
**Due date:** ____________________________________________________\

## Open Questions and Follow-Ups

1. ______________________________________________________________\
2. ______________________________________________________________\
3. ______________________________________________________________\
4. ______________________________________________________________\
5. ______________________________________________________________
