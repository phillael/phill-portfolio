/**
 * Testimonials data for the AboutCarousel component.
 * Contains colleague endorsements displayed in the testimonials slides.
 */

import type { Testimonial } from '@/types/testimonial'

export const testimonials: Testimonial[] = [
  {
    id: 'kimberly-nguyen',
    image: '/images/llama_kimberly.jpg',
    name: 'Kimberly Nguyen',
    position: 'Senior Software Engineer',
    date: 'January 17, 2023',
    relationship: 'Kimberly worked with Phill on the same team at Sessions',
    body: "Phill is a talented engineer who is always excited for a new challenge, takes the initiative to learn and improve, and effortlessly brightens a room with his sense of humor. I was lucky to start at Sessions after him, and always felt comfortable going to him with questions or for help. I learned so much as an engineer from pairing with him and seeing his fast and creative problem solving at work, whether he was tackling MobX state management, squashing complex bugs, or building out pixel-perfect and performant UI. He's a Minnesotan force of nature that any team would be lucky to have, and also an incredibly talented musician! If you're lucky, he'll bless your ears with his guitalele shredding.",
  },
  {
    id: 'joshua-kaulius',
    image: '/images/llama_josh.jpeg',
    name: 'Joshua Kaulius',
    position: 'Sr. Program Manager, Microsoft',
    date: 'January 10, 2023',
    relationship: 'Joshua managed Phill directly at Microsoft',
    body: 'You know how there are some people who are super dedicated and eager to learn and dig into their roles? And you know how there are some people who are just an absolute joy to work with on a personal level and make coming to the office (virtual or otherwise) a pleasure day in and day out? Well, with Phill you have the true all-in-one package. Phill really embodied the Microsoft spirit of "Growth Mindset" - always willing to both build on and contribute to the success of other. He was curious, committed, and never not-interesting. I truly miss having the opportunity to work with Phill on a daily basis. He was a dynamo of positive contributions to both our code and our culture. *In my best Larry David-as-George Steinbrenner voice*: HIRE THIS MAN!',
  },
  {
    id: 'david-shin',
    image: '/images/llama_david.jpeg',
    name: 'David Shin',
    position: 'Software Engineer',
    date: 'January 9, 2023',
    relationship: 'David worked with Phill on the same team at Sessions',
    body: 'Phill is a quirky character that adds a lot of flavor to the team. I was always astonished by his approach to problem-solving and the end result was always a performant and aesthetically pleasing feature. He emits a very positive and upbeat attitude that is quite contagious. Every paired programming session with him was a treat and it was great seeing his creative mind at work. He has helped me through more issues and bugs than I can count. Wherever he ends up next, you are all lucky to have him.',
  },
  {
    id: 'benjamin-blutzer',
    image: '/images/llama_benjamin.jpg',
    name: 'Benjamin Blutzer',
    position: 'Full Stack SeniorSoftware Engineer',
    date: 'December 24, 2022',
    relationship: "Benjamin was Phill's mentor at Microsoft",
    body: "Phill was a pleasure to work with. There was a lot to ramp up on with the Azure.com project and Phill came in eager to learn, be challenged, and contribute. He had a humble attitude when it came to reviewing his code, taking feedback, and collaborating with. He is one of the people I miss the most from my time on that team. He's an asset to any team he joins.",
  },
  {
    id: 'andrew-keturi',
    image: '/images/llama_andrew.jpg',
    name: 'Andrew Keturi',
    position: 'Software Engineer',
    date: 'December 24, 2022',
    relationship: 'Andrew managed Phill directly at Sessions',
    body: "Phill is a creative engineer with a growth mindset and excellent sense of humor. (If you haven't seen his portfolio yet, stop reading this and go to phillcodes.com) Phill reported to me for about a year where he demonstrated clear communication, proactively keeping me in the loop on tasks and anything he needed help with. He contributed early during onboarding and is incredibly receptive to feedback. Phill's a joy to work with. His determination and creativity is inspiring, extending far beyond the realm of engineering.",
  },
]
