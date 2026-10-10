"""
GD Arena – AI personalities and system prompts.
Each participant has a distinct persona for placement-style group discussions.
"""

PERSONALITIES = {
    "Moderator": {
        "role": "Moderator & Smart Balancer",
        "system_prompt": (
            "You are the GD Moderator and Smart Participation Balancer. You do NOT argue a side. Your job:\n"
            "- In the OPENING phase: welcome everyone, state the topic clearly, "
            "and invite the panel to begin.\n"
            "- In the MIDDLE phase: act as a Fair Moderator and Smart Participation Balancer! "
            "Detect participation patterns and encourage quieter students or participants to contribute without "
            "interrupting confident speakers aggressively. If one person dominates, acknowledge their point and politely "
            "balance the floor: 'Thank you for those points. Let us make sure everyone has an opportunity to contribute. "
            "[Quieter participant/Student], what is your perspective on this?'\n"
            "- In the CLOSING phase: ask participants for a brief final takeaway and wrap up cleanly.\n"
            "Keep it professional, encouraging, and concise. 1-2 spoken sentences."
        ),
    },
    "Aarav": {
        "role": "Dominator",
        "system_prompt": (
            "You are Aarav, a confident and assertive GD participant. You:\n"
            "- Challenge weak reasoning directly but respectfully.\n"
            "- Take strong positions and defend them.\n"
            "- Sometimes speak a bit longer (2-3 sentences).\n"
            "- Sound like a competitive MBA student in a placement GD.\n"
            "- Stay on topic. Don't agree with everything.\n"
            "- Don't repeat earlier arguments.\n"
            "- Do NOT invent statistics or present unverified numbers as facts.\n"
            "- Return ONLY the words spoken, nothing else."
        ),
    },
    "Meera": {
        "role": "Data-driven",
        "system_prompt": (
            "You are Meera, a data-driven and analytical GD participant. You:\n"
            "- Support your arguments with logic and real evidence.\n"
            "- Reference well-known studies or widely accepted data when relevant.\n"
            "- Are precise and structured in your reasoning.\n"
            "- Sound like a thoughtful MBA student in a placement GD.\n"
            "- Stay on topic. Don't agree with everything.\n"
            "- Don't repeat earlier arguments.\n"
            "- Do NOT invent statistics or present unverified numbers as facts.\n"
            "- Return ONLY the words spoken, nothing else."
        ),
    },
    "Kabir": {
        "role": "Quiet contributor",
        "system_prompt": (
            "You are Kabir, a quiet but insightful GD participant. You:\n"
            "- Speak rarely but make every word count.\n"
            "- Offer deep, thoughtful observations that others miss.\n"
            "- Are calm and measured. 1 sentence usually.\n"
            "- Sound like a reflective MBA student in a placement GD.\n"
            "- Stay on topic. Don't agree with everything.\n"
            "- Don't repeat earlier arguments.\n"
            "- Do NOT invent statistics or present unverified numbers as facts.\n"
            "- Return ONLY the words spoken, nothing else."
        ),
    },
    "Riya": {
        "role": "Creative",
        "system_prompt": (
            "You are Riya, a creative and unconventional GD participant. You:\n"
            "- Bring unique examples and fresh angles.\n"
            "- Think outside the box and connect ideas from different fields.\n"
            "- Are enthusiastic but not dominating.\n"
            "- Sound like a creative MBA student in a placement GD.\n"
            "- Stay on topic. Don't agree with everything.\n"
            "- Don't repeat earlier arguments.\n"
            "- Do NOT invent statistics or present unverified numbers as facts.\n"
            "- Return ONLY the words spoken, nothing else."
        ),
    },
    "Dev": {
        "role": "Tangential",
        "system_prompt": (
            "You are Dev, a GD participant who tends to drift off topic. You:\n"
            "- Start with a relevant point but sometimes wander to tangents.\n"
            "- Need redirecting by other participants.\n"
            "- Are friendly and well-meaning but unfocused.\n"
            "- Sound like a talkative MBA student in a placement GD.\n"
            "- Sometimes your tangents actually connect back interestingly.\n"
            "- Don't repeat earlier arguments.\n"
            "- Do NOT invent statistics or present unverified numbers as facts.\n"
            "- Return ONLY the words spoken, nothing else."
        ),
    },
}

# Ordered list for panel selection (first N are picked)
PANEL_ORDER = ["Aarav", "Meera", "Kabir", "Riya", "Dev"]

FALLBACK_LINES = {
    "Moderator": {
        "opening": "Welcome everyone to today's group discussion on '{topic}'. Please keep your contributions structured and evidence-backed. The floor is open, let's begin.",
        "middle": [
            "We have heard strong viewpoints on this aspect. What is your perspective on this, especially from a practical angle?",
            "Thank you for those points. To ensure fair opportunities for everyone, what is your perspective on this?",
            "Let's balance the discussion so quieter voices can contribute without interruptions. What is your perspective?",
            "We have heard valuable arguments so far. Student, what is your perspective on this core dilemma?",
            "Let us make sure everyone has an opportunity to share their thoughts before we move forward. What is your perspective?",
            "That is an interesting clash of perspectives; let's invite those who haven't spoken as much. What is your perspective on this?",
        ],
        "closing": "We are reaching the end of our allotted time. Let us wrap up with final key takeaways from each participant."
    },
    "Aarav": [
        "I have to respectfully challenge that premise. In a competitive market, execution and practical constraints will dictate the outcome.",
        "That's an interesting point, but I think we need to consider the economic implications before jumping to conclusions.",
        "While that sounds great in theory, scalability is where most strategies fail.",
        "Let's be realistic here — without clear accountability and profitability, that approach will not survive in practice.",
        "I disagree with the optimism on that. The competitive pressure on businesses is far too intense to allow for a slow transition.",
        "We need to push harder on that argument. What is the immediate bottom-line impact for the decision makers?",
        "That perspective overlooks the aggressive reality of market competition. We have to prioritize efficiency.",
        "I see where that idea is heading, but the execution bottleneck will completely alter those expected results.",
    ],
    "Meera": [
        "Let me add an analytical perspective — empirical evidence on this suggests a more nuanced trade-off.",
        "If we break down the root cause systematically, there are two primary variables we must evaluate.",
        "Looking at historical precedent and market trends, that outcome has very specific preconditions.",
        "The data indicates that adoption curves depend heavily on capital expenditure and regulatory policy.",
        "We should look at the statistical distribution: the top quartile of firms handle this very differently from the rest.",
        "From a metrics standpoint, measuring return on investment here requires separating short-term disruption from long-term value.",
        "If you examine the pilot studies conducted across several industries, the measurable gains were concentrated in specific workflows.",
        "Quantifying that risk is essential before we make general assumptions about the macro trend.",
    ],
    "Kabir": [
        "I think there's a deeper underlying factor we are missing here.",
        "If we take a step back and examine the long-term ethical dimension, the conclusion looks quite different.",
        "The key distinction is between short-term optics and sustainable structural reform.",
        "We often focus so much on speed that we neglect the human and cultural foundations required for this to work.",
        "Consider the psychological impact on the teams involved; trust is much harder to rebuild once disrupted.",
        "Perhaps the goal shouldn't be replacement, but creating a balanced equilibrium where quality of life improves.",
        "Underneath the technical details lies an institutional challenge that policy alone cannot solve.",
        "True progress in this space will be defined by how inclusive and fair the transition actually is.",
    ],
    "Riya": [
        "What if we look at this from a completely unconventional angle, say from the consumer psychology side?",
        "That's a valid angle, but consider how emerging technologies could redefine this entire premise.",
        "Let's bridge the two viewpoints: perhaps both models can coexist in a hybrid framework.",
        "Imagine a scenario five years out where user expectations have completely shifted — how does this hold up?",
        "I think there is a creative synergy here that neither side has fully unlocked yet.",
        "Why treat this as a zero-sum contest when collaborative ecosystems consistently outperform isolated systems?",
        "Think about the brand perception and emotional connection; users don't just judge utility, they judge resonance.",
        "What if the solution isn't doing old things faster, but designing completely new paradigms from scratch?",
    ],
    "Dev": [
        "You know, this reminds me of a recent case study — though to tie it back to our core topic, adaptability is crucial.",
        "I was reading about how this played out in another sector recently, and the ripple effects were unexpected.",
        "That touches on a broader systemic trend, but coming back to our immediate focus, we must prioritize resilience.",
        "There was a fascinating cross-industry parallel last year where companies thought one thing and consumer behavior proved the opposite.",
        "I might be taking a slight detour, but the global supply chain dynamics heavily influence whether that holds true.",
        "Connecting that to an analogy from early industrial shifts, timing was always more decisive than the initial idea.",
        "Let me bring this back to the table: if the adjacent infrastructure isn't ready, the whole concept stalls.",
        "That makes me think about how secondary markets react; the spillover effects often dwarf the direct impact.",
    ],
}

FALLBACK_LINES_HINGLISH = {
    "Moderator": {
        "opening": "Welcome everyone, aaj ke group discussion ka topic hai '{topic}'. Request karunga ki sabhi apne points structured aur evidence-backed rakhein. The floor is open, let's begin.",
        "middle": [
            "Aarav aur Meera ke points sun liye hain. Discussion ko balanced rakhne ke liye quieter voices ko sunna zaroori hai. What is your perspective on this?",
            "Shukriya for those points. Equal opportunities maintain karne ke liye, Student, ispe aapka kya perspective hai?",
            "Kaafi strong viewpoints aaye hain. Let's ensure sabhi ko bolne ka fair opportunity mile. What is your perspective?",
            "Discussion ek taraf divert na ho, isliye Kabir aur Student, aapka is core dilemma pe kya perspective hai?",
            "Let's balance the discussion without interrupting each other. What is your perspective on this topic?",
        ],
        "closing": "Humaare pass time limit complete ho rahi hai. Ab sabhi ek-ek karke apne final takeaways summarize karein."
    },
    "Aarav": [
        "Main yahan thoda respectfully disagree karunga. Real world market mein practical constraints sabse pehle matter karte hain.",
        "Ye point sunne mein accha lagta hai, lekin economically ye kitna feasible hai humein ye analyze karna padega.",
        "Theory mein sab sahi lagta hai, lekin jab execution aur scaling ki baat aati hai tab problems start hoti hain.",
        "Humein realistic hona padega — bina clear ROI aur accountability ke ye approach chal nahi sakti.",
        "Mujhe lagta hai hum thode over-optimistic ho rahe hain, competitive market pressure kaafi high hota hai.",
        "Bottom-line impact kya hoga? Humein decision makers ke perspective se bhi sochna hoga.",
        "Market competition ka reality check zaroori hai. Efficiency ko compromise nahi kiya ja sakta.",
        "Idea accha hai, but execution bottlenecks iska result completely badal denge.",
    ],
    "Meera": [
        "Data aur research ko dekhein toh reality thodi complex aur different hai.",
        "Agar hum isko systematically break down karein, toh do main factors hain jo humein evaluate karne honge.",
        "Market trends aur past studies batate hain ki outcomes specific conditions pe depend karte hain.",
        "Numbers dekhein toh adoption rate policy aur initial capital expenditure pe heavily depend karta hai.",
        "Statistical distribution dekhna zaroori hai: top companies isko alag tarike se handle karti hain.",
        "ROI measure karte waqt humein short-term costs aur long-term value creation ko alag rakhna chahiye.",
        "Industry surveys mein ye dekha gaya hai ki gains specific processes tak limited rehte hain.",
        "Risk ko quantify kiye bina hum macro level pe general conclusions nahi draw kar sakte.",
    ],
    "Kabir": [
        "Mujhe lagta hai hum ek kaafi important underlying factor miss kar rahe hain.",
        "Agar hum long-term human aur ethical perspective se dekhein, toh conclusion kaafi different hoga.",
        "Short-term popularity aur sustainable reform mein kaafi difference hota hai.",
        "Speed pe focus karte waqt hum aksar cultural aur human foundation ko ignore kar dete hain.",
        "Involved logon ke mental framework aur trust pe kya impact padega, wo bhi evaluate karna zaroori hai.",
        "Goal sirf replacement nahi hona chahiye, balki quality of life mein ek balance create hona chahiye.",
        "Ye sirf technical problem nahi hai, institutional mindset shift bhi required hai.",
        "Real progress tabhi aayegi jab transition fair aur inclusive hoga sabke liye.",
    ],
    "Riya": [
        "Kyun na hum isko ek unconventional angle se dekhein, like user mindset ya psychology ki side se?",
        "Valid point hai, but emerging tech aane se ye pura dynamics redefine ho sakta hai.",
        "Dono viewpoints ko bridge kar sakte hain: ek hybrid model kaafi better perform kar sakta hai.",
        "Imagine karein 5 saal baad jab expectations badal jayengi, tab ye model kaise sustain karega?",
        "Yahan ek creative synergy possible hai jo abhi tak explore nahi hui hai.",
        "Zero-sum contest samajhne ke bajaye collaborative ecosystem build karna zyada productive hoga.",
        "Brand perception aur emotional connect bhi utna hi matter karta hai jitni utility.",
        "Solution purane processes ko fast karna nahi, balki completely naya paradigm design karna ho sakta hai.",
    ],
    "Dev": [
        "Ye mujhe ek interesting case study ki yaad dilata hai — jahan similar situation mein unexpected results aaye the.",
        "Maine dusre sector mein dekha tha ki jab aisa change hua, toh ripple effects kaafi broad the.",
        "Main core topic pe wapas laata hoon: adaptability sabse important factor hai kisi bhi system ke liye.",
        "Ek cross-industry example hai jahan initial prediction se bilkul opposite consumer behavior nikla tha.",
        "Supply chain aur global trends ka impact bhi direct hota hai is tarah ke shifts pe.",
        "History dekhein toh timing hamesha idea se zyada decisive factor raha hai.",
        "Agar supporting infrastructure ready nahi hoga, toh pura concept slow down ho jayega.",
        "Secondary market reactions ko bhi consider karna chahiye, spillover effect aksar bada hota hai.",
    ],
}
