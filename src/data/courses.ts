import { Course } from '../types';

export const COURSES_DATA: Course[] = [
  {
    id: 'course-cost-pricing-profit',
    category: 'pricing_profit',
    title: {
      hi: 'लागत, बिक्री मूल्य और मुनाफे का सही हिसाब',
      en: 'Cost, Selling Price and Profit Calculation',
    },
    shortDescription: {
      hi: 'सीखें कि घरेलू उत्पादों (सिलाई, आचार, पापड़, हस्तशिल्प) की असली लागत कैसे निकालें और सही मुनाफा कैसे तय करें।',
      en: 'Master how to accurately calculate raw materials, labor, overheads, and set profitable selling prices.',
    },
    fullDescription: {
      hi: 'अक्सर ग्रामीण और छोटे गृह-उद्योगों में महिलाएं सिर्फ कच्चे माल का खर्च जोड़ती हैं और अपनी मेहनत, बिजली या आने-जाने के खर्च को भूल जाती हैं। इस कोर्स में आप व्यावहारिक उदाहरणों से सीखेंगे कि कैसे अपने समय की कीमत तय करें, हर छोटे-बड़े खर्च को जोड़ें और सम्मानजनक मुनाफा कमाएं।',
      en: 'Micro-entrepreneurs often underprice their items by neglecting personal labor, transport, and indirect costs. This course uses everyday small-business scenarios to show you how to price for sustainable profit.',
    },
    level: 'Beginner',
    estimatedHours: 2.5,
    languageAvailable: ['hi', 'en'],
    thumbnail: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80',
    badgeTitle: {
      hi: 'मुनाफा विशेषज्ञ सखी (Profit Master)',
      en: 'Profit & Pricing Specialist',
    },
    rating: 4.9,
    reviewCount: 342,
    lessons: [
      {
        id: 'lesson-cost-types',
        courseId: 'course-cost-pricing-profit',
        order: 1,
        durationMinutes: 15,
        title: {
          hi: '1. कच्चे माल और छिपे हुए खर्चों की पहचान',
          en: '1. Identifying Raw Materials and Hidden Costs',
        },
        summary: {
          hi: 'जानें कि प्रत्यक्ष (Direct) और अप्रत्यक्ष (Indirect) लागत में क्या अंतर है और क्यों कोई भी खर्च छोटा नहीं होता।',
          en: 'Understand the critical difference between direct raw materials and hidden indirect overheads.',
        },
        content: {
          hi: {
            introduction: 'किसी भी वस्तु को बनाने में सिर्फ कच्चा माल ही खर्च नहीं होता। कई ऐसे छोटे खर्च होते हैं जिन्हें हम नज़रअंदाज़ कर देते हैं, जिससे महीने के अंत में जेब खाली रह जाती है।',
            storyExample: {
              character: 'सुनीता दीदी (सूट सिलाई कार्य)',
              title: 'सुनीता दीदी की आंखें कैसे खुलीं',
              story: 'सुनीता दीदी ने ₹200 का कपड़ा और ₹20 के बटन खरीदकर एक कुर्ती सिली और पड़ोसन को ₹250 में दे दी। उन्हें लगा ₹30 का फायदा हुआ। लेकिन जब उन्होंने सिलाई मशीन की सुई, तेल, प्रेस की बिजली और दुकान तक ऑटो के ₹20 जोड़े, तो उन्हें पता चला कि वे उल्टे ₹5 के घाटे में थीं!',
            },
            sections: [
              {
                heading: '1. प्रत्यक्ष लागत (कच्चा माल)',
                body: 'वह सामान जो सीधे उत्पाद में इस्तेमाल होता है। जैसे: कपड़ा, आचार के लिए आम, मसाले, तेल, मिठाई के लिए चीनी व मावा। इसे गिनना आसान होता है।',
                tip: 'हमेशा थोक मंडी से खरीदारी की रसीद या डायरी में दाम नोट करें।',
              },
              {
                heading: '2. अप्रत्यक्ष लागत (छिपे हुए खर्च)',
                body: 'वह खर्च जो उत्पाद में सीधे नहीं दिखता लेकिन उसके बिना काम नहीं हो सकता। जैसे: गैस/बिजली का बिल, पैकिंग की पॉलीथिन, डिब्बे, सिलाई मशीन का रख-रखाव और सामान लाने-ले जाने का किराया।',
                tip: 'हर पीस पर कम से कम ₹10 से ₹25 अप्रत्यक्ष खर्च ज़रूर जोड़ें।',
              },
            ],
            practicalActivity: {
              title: 'आज ही अपनी डायरी में यह अभ्यास करें:',
              instructions: [
                'अपने किसी एक उत्पाद (जैसे 1 किलो आचार या 1 ब्लाउज) को चुनें।',
                'बाएं पन्ने पर कच्चे माल की सूची और कीमत लिखें।',
                'दाएं पन्ने पर 3 छिपे हुए खर्च (जैसे बिजली, गैस, ऑटो किराया या डिब्बा) लिखें।',
                'दोनों का जोड़ निकालें — यह आपकी वास्तविक सामग्री लागत है!',
              ],
            },
            keyTakeaways: [
              'सिर्फ कपड़े या मसाले की कीमत ही लागत नहीं होती।',
              'छिपे हुए खर्च (पैकिंग, बिजली, किराया) को न जोड़ने से सीधा नुकसान होता है।',
              'हर छोटी खरीदारी की पर्ची संभाल कर रखें।',
            ],
          },
          en: {
            introduction: 'Producing any handcrafted or homemade item involves more than just raw ingredients. Hidden overheads frequently erode real earnings if ignored.',
            storyExample: {
              character: 'Sunita Didi (Tailoring & Garments)',
              title: 'Why Sunita’s Ledger Was In The Red',
              story: 'Sunita bought cloth for ₹200 and buttons for ₹20, stitched a kurti, and sold it to a neighbour for ₹250. She assumed a ₹30 profit. But once she accounted for machine oil, electricity for ironing, and ₹20 shared auto fare to the market, she was actually losing ₹5 per kurti!',
            },
            sections: [
              {
                heading: '1. Direct Costs (Raw Materials)',
                body: 'Materials that physically go into the item: fabric, raw mangoes, mustard oil, glass jars, spices, sugar.',
                tip: 'Always note bulk wholesale prices to keep direct costs lean.',
              },
              {
                heading: '2. Indirect Overheads (Hidden Costs)',
                body: 'Necessary operational expenses: gas cylinder usage, transport fare, packaging tapes, machine maintenance, label tags.',
                tip: 'Allocate ₹10 to ₹30 per unit to cover indirect overheads.',
              },
            ],
            practicalActivity: {
              title: 'Practical Ledger Exercise:',
              instructions: [
                'Pick one standard item you sell (e.g., 1 kg pickle or 1 stitched dress).',
                'List all direct raw material inputs on the left column.',
                'List at least 3 hidden overheads (packaging, power, transport) on the right column.',
                'Sum both columns to find your true Base Material Cost.',
              ],
            },
            keyTakeaways: [
              'Raw material cost is never your total cost.',
              'Neglecting overheads leads to silent business losses.',
              'Maintain a simple daily register of all supplies purchased.',
            ],
          },
        },
      },
      {
        id: 'lesson-labor-time-value',
        courseId: 'course-cost-pricing-profit',
        order: 2,
        durationMinutes: 18,
        title: {
          hi: '2. अपनी मेहनत और समय का मूल्य तय करना',
          en: '2. Valuing Your Personal Labor and Time',
        },
        summary: {
          hi: 'अपनी मेहनत को "मुफ़्त" समझना सबसे बड़ी भूल है। जानिए प्रति घंटा या प्रति पीस श्रम लागत कैसे निकालें।',
          en: 'Treating your own time as free is the fastest route to burnout. Learn how to calculate fair labor cost.',
        },
        content: {
          hi: {
            introduction: 'महिलाएं अक्सर कहती हैं, "मेहनत तो मेरी अपनी ही है, उसका क्या पैसा जोड़ना!" यह सोच आपके व्यापार को कभी आगे नहीं बढ़ने देती। यदि आप किसी कारीगर को रखते, तो उसे मजदूरी देते — इसलिए खुद की मेहनत भी एक अनिवार्य लागत है।',
            storyExample: {
              character: 'मीना ताई (हस्तनिर्मित बैग)',
              title: 'मीना ताई की समझदारी',
              story: 'मीना ताई एक जूट बैग बनाने में 4 घंटे लगाती थीं। जब उन्होंने तय किया कि उनके 1 घंटे की मेहनत कम से कम ₹40 की है (4 घंटे = ₹160), तब जाकर वे समझ पाईं कि उन्हें बैग कितने में बेचना चाहिए ताकि उनका परिवार आत्मनिर्भर बन सके।',
            },
            sections: [
              {
                heading: '1. प्रति घंटा मेहनत का हिसाब',
                body: 'मान लीजिए आप महीने में 25 दिन, रोजाना 6 घंटे काम करती हैं (कुल 150 घंटे)। यदि आप अपने लिए महीने का ₹6,000 न्यूनतम पारिश्रमिक चाहती हैं, तो आपकी 1 घंटे की कीमत ₹40 हुई (₹6000 ÷ 150)।',
                tip: 'यदि किसी उत्पाद में 2 घंटे लगते हैं, तो श्रम लागत = 2 × ₹40 = ₹80।',
              },
              {
                heading: '2. मजदूरी लागत जोड़ना क्यों ज़रूरी है?',
                body: 'जब कल आपका काम बढ़ेगा और आप किसी सहायिका को रखेंगी, तो ग्राहक अचानक बढ़ी हुई कीमत स्वीकार नहीं करेंगे। इसलिए शुरू से ही श्रम लागत जोड़कर चलें।',
                tip: 'श्रम लागत को लागत (Cost) में जोड़ें, यह आपका "मुनाफा" नहीं बल्कि आपकी "मजदूरी" है।',
              },
            ],
            practicalActivity: {
              title: 'अपने समय का मूल्य निकालें:',
              instructions: [
                'तय करें कि आप महीने में अपनी मेहनत का कितना पारिश्रमिक पाना चाहती हैं (उदा. ₹5,000 या ₹8,000)।',
                'महीने में जितने घंटे काम करती हैं, उससे भाग दें।',
                'अब अपने उत्पाद को बनाने में लगने वाले घंटों से गुणा करें। यही आपकी श्रम लागत है!',
              ],
            },
            keyTakeaways: [
              'आपकी अपनी मेहनत मुफ़्त नहीं है; यह एक व्यावसायिक लागत है।',
              'श्रम शुल्क तय करने से भविष्य में कारीगर रखना आसान हो जाता है।',
              'श्रम मजदूरी अलग है और व्यापार का शुद्ध लाभ (Profit) अलग है।',
            ],
          },
          en: {
            introduction: 'Women frequently say: "It’s just my own time, so it costs nothing." This mindset prevents micro-enterprises from scaling. If you hired a helper, you would pay wages—your time is equally valuable.',
            storyExample: {
              character: 'Meena Tai (Jute Handicrafts)',
              title: 'Meena’s Transformation',
              story: 'Meena Tai spent 4 hours crafting an embroidered tote bag. Once she valued her skill at ₹40/hour (₹160 per bag), she realized her bags were worth far more than the raw jute, giving her family real financial dignity.',
            },
            sections: [
              {
                heading: '1. Calculating Hourly Wage',
                body: 'If you dedicate 150 hours a month and target ₹6,000 as your earned personal wage, your hourly rate is ₹40. A 2-hour craft requires ₹80 in labor cost.',
                tip: 'Always treat personal labor as a hard expense line item.',
              },
              {
                heading: '2. Preparing to Hire and Scale',
                body: 'If you do not include labor from day one, you cannot afford to hire assistants as customer demand surges without shocking clients with price hikes.',
                tip: 'Labor is wages; profit is growth capital for the business.',
              },
            ],
            practicalActivity: {
              title: 'Set Your Hourly Baseline:',
              instructions: [
                'Set your monthly desired personal wage target (e.g. ₹6,000).',
                'Divide by estimated monthly working hours (e.g. 150 hours = ₹40/hr).',
                'Multiply by the time needed to make 1 unit of your product.',
              ],
            },
            keyTakeaways: [
              'Your labor is a real expense, never free labor.',
              'Separating labor from profit is the key to business sustainability.',
              'Charge proudly for your artisan skills.',
            ],
          },
        },
      },
      {
        id: 'lesson-pricing-formula',
        courseId: 'course-cost-pricing-profit',
        order: 3,
        durationMinutes: 20,
        title: {
          hi: '3. सही बिक्री मूल्य का अचूक फॉर्मूला',
          en: '3. The Master Formula for Selling Price and Profit',
        },
        summary: {
          hi: 'कुल लागत + सुरक्षित मुनाफा = सही बिक्री मूल्य। जानिए 25% से 40% मार्जिन कैसे जोड़ें।',
          en: 'Total Cost + Target Margin = Selling Price. How to ensure healthy 25-40% gross margins.',
        },
        content: {
          hi: {
            introduction: 'अब समय आ गया है सभी टुकड़ों को जोड़कर एक ऐसा बिक्री मूल्य तय करने का जो बाजार में उचित भी हो और आपके व्यवसाय को हर महीने आगे भी बढ़ाए।',
            storyExample: {
              character: 'कमला बहन (पापड़ और स्नैक्स)',
              title: 'कमला बहन का 100 पैकेट का गणित',
              story: 'कमला बहन 100 पैकेट पापड़ बनाती हैं। कच्चा माल ₹1,200, पैकिंग व मसाला ₹300, श्रम ₹500। कुल लागत हुई ₹2,000 (प्रति पैकेट ₹20)। उन्होंने 35% मुनाफा (₹7 प्रति पैकेट) जोड़ा और ₹27 में बेचा। 100 पैकेट बिकने पर उन्हें ₹700 का शुद्ध लाभ हुआ, जिससे उन्होंने नई पैकेजिंग मशीन ली!',
            },
            sections: [
              {
                heading: 'गोल्डन फॉर्मूला (The Golden Formula)',
                body: 'कुल लागत = कच्चा माल + श्रम (मेहनत) + अन्य खर्च (पैकिंग, बिजली, यात्रा)।\nबिक्री मूल्य = कुल लागत + (कुल लागत × मुनाफा प्रतिशत ÷ 100)।',
                tip: 'हस्तशिल्प और फूड उत्पादों में कम से कम 30% से 40% मुनाफा मार्जिन रखें।',
              },
              {
                heading: 'बाजार के दाम से तुलना कैसे करें?',
                body: 'यदि आपका निकाला गया मूल्य बाजार से थोड़ा ज्यादा है, तो अपनी खूबी (जैसे शुद्धता, हाथ की कढ़ाई, ताजा मसाले) ग्राहक को समझाएं। कभी भी गुणवत्ता से समझौता करके दाम मत घटाइए।',
                tip: 'सस्ता बेचने से ग्राहक बढ़ते हैं पर व्यापार बंद हो जाता है; अच्छा बेचने से ग्राहक बार-बार आते हैं।',
              },
            ],
            practicalActivity: {
              title: 'सखीबिज प्रॉफिट कैलकुलेटर आज़माएं:',
              instructions: [
                'ऊपर नेविगेशन में "बिजनेस टूल्स" पर जाएं।',
                'Profit Calculator खोलें।',
                'अपने उत्पाद की लागत और बिक्री मूल्य डालकर तुरंत देखें कि आपको कितना % मुनाफा हो रहा है!',
              ],
            },
            keyTakeaways: [
              'बिक्री मूल्य = कुल लागत + लक्षित मुनाफा।',
              'गुणवत्ता और विश्वसनीयता के आधार पर दाम तय करें, केवल मजबूरी में नहीं।',
              'नियमित रूप से अपने मुनाफे का 20% नए सामान या बचत में लगाएं।',
            ],
          },
          en: {
            introduction: 'Bring every element together into a transparent formula that wins customer trust while fueling monthly savings and reinvestment.',
            storyExample: {
              character: 'Kamla Bahen (Snacks & Papad)',
              title: 'Kamla’s 100-Pack Success',
              story: 'Kamla produced 100 packs of organic papad. Raw lentils: ₹1,200. Spices & seal bags: ₹300. Artisan labor: ₹500. Total Cost = ₹2,000 (₹20/pack). She added a 35% margin (₹7) and retailed at ₹27. After 100 packs, she cleared ₹700 net profit to reinvest into a mechanical sealer!',
            },
            sections: [
              {
                heading: 'The Core Formula',
                body: 'Total Cost = Raw Materials + Labor + Overheads.\nSelling Price = Total Cost + (Total Cost × Desired Margin % ÷ 100).',
                tip: 'Aim for 30% to 45% margin on handcrafted or artisanal foods.',
              },
              {
                heading: 'Comparing Against Market Rates',
                body: 'If your price is slightly higher than mass-produced factory items, articulate your quality advantage: pure ingredients, customized stitching, fresh preparation.',
                tip: 'Competing solely on being the cheapest leads to insolvency. Compete on trust.',
              },
            ],
            practicalActivity: {
              title: 'Test with the SakhiBiz Profit Calculator:',
              instructions: [
                'Navigate to the "Business Toolkit" tab in the header.',
                'Open the Profit Calculator.',
                'Enter unit cost, desired price, and quantity to see exact margins in seconds!',
              ],
            },
            keyTakeaways: [
              'Selling Price = Total Cost + Realistic Margin.',
              'Highlight authentic handmade value rather than discounting frantically.',
              'Reinvest a portion of monthly profits back into productive tools.',
            ],
          },
        },
      },
    ],
    quiz: {
      id: 'quiz-cost-pricing-profit',
      courseId: 'course-cost-pricing-profit',
      title: {
        hi: 'मूल्य निर्धारण एवं मुनाफा टेस्ट',
        en: 'Pricing & Profit Mastery Quiz',
      },
      passingScorePercent: 75,
      questions: [
        {
          id: 'q1',
          question: {
            hi: 'यदि एक कुर्ती बनाने में ₹250 का कपड़ा, ₹30 की सिलाई सामग्री और ₹70 आपकी खुद की मेहनत लगती है, तो कुर्ती की कुल लागत क्या होगी?',
            en: 'If making a kurti requires ₹250 cloth, ₹30 notions/packaging, and ₹70 for your labor, what is the Total Cost?',
          },
          options: {
            hi: ['₹250 (सिर्फ कपड़ा)', '₹280 (कपड़ा और सामग्री)', '₹350 (कपड़ा + सामग्री + श्रम लागत)', '₹500'],
            en: ['₹250 (cloth only)', '₹280 (cloth & materials)', '₹350 (cloth + materials + labor)', '₹500'],
          },
          correctOptionIndex: 2,
          explanation: {
            hi: 'सही उत्तर ₹350 है! कुल लागत में कच्चा माल (₹250), सामग्री (₹30) और आपकी खुद की मेहनत (₹70) तीनों को जोड़ना अनिवार्य है।',
            en: 'Correct is ₹350! Total cost must combine direct materials (₹250), accessories (₹30), and your personal labor (₹70).',
          },
        },
        {
          id: 'q2',
          question: {
            hi: 'महिला उद्यमियों द्वारा की जाने वाली सबसे आम वित्तीय गलती क्या है?',
            en: 'What is the most frequent pricing mistake made by home-based micro-entrepreneurs?',
          },
          options: {
            hi: [
              'अपनी खुद की मेहनत (समय) को मुफ़्त मान लेना और लागत में न जोड़ना',
              'अच्छी गुणवत्ता का कच्चा माल खरीदना',
              'ग्राहकों को पक्का बिल या हिसाब देना',
              'दुकान पर साफ़-सफ़ाई रखना',
            ],
            en: [
              'Treating their own time as zero cost and omitting personal labor',
              'Purchasing top quality raw materials',
              'Maintaining a transparent ledger',
              'Keeping the workspace organized',
            ],
          },
          correctOptionIndex: 0,
          explanation: {
            hi: 'अपनी मेहनत का मूल्य न जोड़ना सबसे बड़ी भूल है। इससे लगता है कि मुनाफा हो रहा है, जबकि असल में आप मुफ़्त में काम कर रही होती हैं।',
            en: 'Omitting personal labor creates an illusion of profit when in reality you are working for zero wage.',
          },
        },
        {
          id: 'q3',
          question: {
            hi: 'यदि किसी वस्तु की कुल लागत ₹100 है और आप 30% मुनाफा कमाना चाहती हैं, तो सही बिक्री मूल्य क्या होगा?',
            en: 'If the total cost of an item is ₹100 and you target a 30% profit margin, what should the selling price be?',
          },
          options: {
            hi: ['₹100', '₹130', '₹110', '₹70'],
            en: ['₹100', '₹130', '₹110', '₹70'],
          },
          correctOptionIndex: 1,
          explanation: {
            hi: 'सही उत्तर ₹130 है! कुल लागत (₹100) + 30% मुनाफा (₹30) = ₹130 बिक्री मूल्य।',
            en: 'Correct is ₹130! Total Cost (₹100) + 30% Profit Margin (₹30) = ₹130 Selling Price.',
          },
        },
        {
          id: 'q4',
          question: {
            hi: 'अप्रत्यक्ष खर्च (Indirect Costs) में इनमें से क्या शामिल होता है?',
            en: 'Which of the following is considered an Indirect Overhead cost?',
          },
          options: {
            hi: [
              'दुकान या वर्कशॉप की बिजली, गैस और आने-जाने का ऑटो किराया',
              'सूट में लगने वाला मुख्य कपड़ा',
              'आचार में डलने वाले मुख्य आम',
              'केवल ग्राहकों को दिया जाने वाला डिस्काउंट',
            ],
            en: [
              'Electricity, gas fuel, and transport/auto fares',
              'The primary dress fabric',
              'Raw mangoes for pickle',
              'Discounts offered to customers',
            ],
          },
          correctOptionIndex: 0,
          explanation: {
            hi: 'बिजली, पैकिंग, गैस और आने-जाने का किराया अप्रत्यक्ष खर्च हैं जिन्हें हर उत्पाद में थोड़ा-थोड़ा जोड़ना चाहिए।',
            en: 'Utilities, gas, transport, and packaging are indirect overheads that must be allocated per unit.',
          },
        },
      ],
    },
  },
  {
    id: 'course-digital-payments-safety',
    category: 'digital_payments',
    title: {
      hi: 'सुरक्षित डिजिटल भुगतान और ऑनलाइन धोखाधड़ी से बचाव',
      en: 'Safe Digital Payments & Scam Prevention',
    },
    shortDescription: {
      hi: 'सीखें कि UPI और QR कोड से सुरक्षित पैसे कैसे लें और फर्जी स्क्रीनशॉट व OTP घोटालों से अपनी कमाई कैसे बचाएं।',
      en: 'Learn how to accept UPI QR payments safely and protect your hard-earned money from scam calls and fake screenshots.',
    },
    fullDescription: {
      hi: 'डिजिटल पेमेंट ने महिला उद्यमियों के लिए व्यापार बहुत आसान कर दिया है, लेकिन साइबर ठग नए-नए तरीकों से महिलाओं को निशाना बनाते हैं। यह कोर्स आपको सिखाएगा कि UPI PIN का सही नियम क्या है, साउंडबॉक्स या बैंक SMS से पैसे की पुष्टि कैसे करें और किसी भी अनजान लिंक पर क्लिक करने से कैसे बचें।',
      en: 'Digital payments empower grassroots businesses with instant settlement, but cyber frauds target uninformed merchants. This course provides step-by-step vigilance training on UPI security, soundboxes, and fake payment verification.',
    },
    level: 'Beginner',
    estimatedHours: 2.0,
    languageAvailable: ['hi', 'en'],
    thumbnail: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=800&q=80',
    badgeTitle: {
      hi: 'सुरक्षित डिजिटल सखी (Digital Safety Champion)',
      en: 'Digital Safety Champion',
    },
    rating: 5.0,
    reviewCount: 418,
    lessons: [
      {
        id: 'lesson-upi-golden-rule',
        courseId: 'course-digital-payments-safety',
        order: 1,
        durationMinutes: 15,
        title: {
          hi: '1. डिजिटल सुरक्षा का स्वर्णिम नियम: UPI PIN की सच्चाई',
          en: '1. The Golden Rule of Digital Safety: UPI PIN Truth',
        },
        summary: {
          hi: 'यह एक बात जीवन भर याद रखें: पैसे प्राप्त करने (Receive) के लिए कभी भी UPI PIN डालने की आवश्यकता नहीं होती!',
          en: 'Memorize this core truth: You NEVER need to enter a UPI PIN to RECEIVE money.',
        },
        content: {
          hi: {
            introduction: 'भारत सरकार और भारतीय रिजर्व बैंक (RBI) का सबसे महत्वपूर्ण नियम: UPI PIN सिर्फ आपके बैंक से पैसे काटने की चाबी है, पैसे पाने की नहीं!',
            storyExample: {
              character: 'शांति बाई (किराना दुकान)',
              title: 'शांति बाई ने कैसे बचाया अपना खाता',
              story: 'एक अज्ञात व्यक्ति ने शांति बाई को फोन किया कि "मैंने आपकी दुकान से 5 किलो आटा लेना है, मैं ₹250 एडवांस भेज रहा हूँ, आप इस लिंक पर क्लिक करके अपना UPI पिन डालें।" शांति बाई ने सखीबिज में सीखा था कि पैसे लेने के लिए पिन नहीं डालते। उन्होंने तुरंत फोन काट दिया और अपनी गाढ़ी कमाई बचा ली!',
            },
            sections: [
              {
                heading: 'स्वर्णिम नियम (The Golden Rule)',
                body: 'जब आप किसी को पैसे भेजते हैं (Send), तभी UPI PIN डालना होता है। जब कोई आपको पैसे भेजता है (Receive), तो पैसे सीधे आपके खाते में आते हैं — आपको कोई बटन नहीं दबाना और कोई PIN नहीं डालना!',
                tip: 'यदि कोई कहे कि "PIN डालो तभी पैसे क्रेडिट होंगे", तो वह 100% धोखेबाज (Scammer) है।',
              },
              {
                heading: 'दुकान पर QR कोड का सही इस्तेमाल',
                body: 'दुकान या काउंटर पर अपना स्थायी UPI QR कोड स्टैंड लगाएं। ग्राहक से कहें कि वह इसे स्कैन करके पेमेंट करे। ग्राहक द्वारा भुगतान करने के बाद अपने फोन पर बैंक का SMS या साउंडबॉक्स की आवाज सुनें।',
                tip: 'कभी भी ग्राहक के फोन में अपना UPI PIN न डालें।',
              },
            ],
            practicalActivity: {
              title: 'आज ही यह सुरक्षा जांच करें:',
              instructions: [
                'अपने परिवार और सहायकों को यह स्वर्णिम नियम ज़ोर से पढ़कर सुनाएं।',
                'अपने UPI ऐप (जैसे PhonePe, Google Pay या Paytm) का पासवर्ड किसी डायरी में खुले में न लिखें।',
                'सुनिश्चित करें कि आपका बैंक से जुड़ा मोबाइल नंबर आपके ही पास रहे।',
              ],
            },
            keyTakeaways: [
              'पैसे लेने के लिए UPI PIN कभी नहीं डाला जाता।',
              'अनजान व्यक्ति द्वारा भेजे गए किसी भी लिंक पर कभी क्लिक न करें।',
              'शक होने पर तुरंत स्थानीय बैंक शाखा या 1930 (साइबर हेल्पलाइन) पर संपर्क करें।',
            ],
          },
          en: {
            introduction: 'The Reserve Bank of India’s fundamental directive: A UPI PIN is the digital key to deduct money from your account, never to receive money into it.',
            storyExample: {
              character: 'Shanti Bai (Grocery & Kirana)',
              title: 'How Shanti Thwarted a Fraudster',
              story: 'A caller claimed he wanted to order 5 bags of grain and sent a payment link, telling Shanti: "Click this link and enter your UPI PIN to approve the ₹1,000 credit." Because Shanti completed SakhiBiz training, she knew receiving money requires zero PIN. She hung up immediately and saved her savings!',
            },
            sections: [
              {
                heading: 'The Irreversible Rule',
                body: 'UPI PIN is used ONLY to SEND money. When money is being paid to you, funds deposit directly into your linked bank account without you typing any PIN or passcode.',
                tip: 'Anyone asking you to enter a PIN to receive a payment or reward is an active scammer.',
              },
              {
                heading: 'Merchant QR Code Hygiene',
                body: 'Display your official printed QR code on your craft stall or shop counter. Ensure your linked soundbox announces payments aloud or check your real bank SMS notification.',
                tip: 'Never handle a customer’s phone to type your credentials.',
              },
            ],
            practicalActivity: {
              title: 'Family & Staff Safety Drill:',
              instructions: [
                'Share the golden rule with any family members or assistants who manage your sales desk.',
                'Ensure your UPI transaction PIN is known only to you.',
                'Save the national cybercrime helpline number (1930) in your contacts.',
              ],
            },
            keyTakeaways: [
              'Zero PIN is required to receive incoming funds.',
              'Never tap on unsolicited payment approval links.',
              'Verify transactions via your own device, not the buyer’s screen.',
            ],
          },
        },
      },
      {
        id: 'lesson-fake-screenshots-alerts',
        courseId: 'course-digital-payments-safety',
        order: 2,
        durationMinutes: 16,
        title: {
          hi: '2. फर्जी स्क्रीनशॉट और नकली SMS से कैसे बचें',
          en: '2. Spotting Fake Screenshots and Spoofed SMS Alerts',
        },
        summary: {
          hi: 'ठग फर्जी ऐप से हरा टिक वाला "Payment Successful" स्क्रीनशॉट दिखाते हैं। जानिए असली पुष्टि कैसे करें।',
          en: 'Scammers show counterfeit payment apps with fake green checkmarks. Learn real-time verification.',
        },
        content: {
          hi: {
            introduction: 'आजकल इंटरनेट पर ऐसे फर्जी ऐप्स आ गए हैं जो नकली "सफल भुगतान" (Payment Successful) स्क्रीन दिखाते हैं। जब तक आपके अपने फोन पर बैंक की पुष्टि न आए, सामान कभी न सौंपें।',
            storyExample: {
              character: 'अनिता दीदी (बुटीक व चूड़ी विक्रेता)',
              title: 'अनिता दीदी की सतर्कता',
              story: 'एक ग्राहक ने ₹800 के कंगन लिए और अपने फोन पर हरा स्क्रीनशॉट दिखाया कि "दीदी पैसे चले गए, जल्दी में हूँ जा रहा हूँ।" अनिता ने कहा, "भैया, 10 सेकंड रुकिए, मेरे फोन में मैसेज आने दीजिए।" 30 सेकंड बाद भी मैसेज नहीं आया। जब दोबारा चेक किया तो पता चला वह सिर्फ एक फोटो थी! ग्राहक को असली पेमेंट करनी पड़ी।',
            },
            sections: [
              {
                heading: '1. ग्राहक के फोन पर कभी भरोसा न करें',
                body: 'ग्राहक का फोन नकली हो सकता है या उसमें एडिट किया हुआ फोटो हो सकता है। हमेशा पुष्टि अपने उपकरण (आपके फोन का SMS, आपका UPI ऐप या साउंडबॉक्स) पर करें।',
                tip: 'जल्दबाजी करने वाले ग्राहकों से विशेष रूप से सावधान रहें।',
              },
              {
                heading: '2. साउंडबॉक्स या UPI व्यापारी ऐप का उपयोग',
                body: 'यदि आपकी दुकान पर रोज़ कई ग्राहक आते हैं, तो एक छोटा साउंडबॉक्स (जैसे Paytm/PhonePe/Google Pay साउंडबॉक्स) बहुत मददगार होता है। यह जोर से बोलकर बताता है: "₹250 प्राप्त हुए"।',
                tip: 'यदि साउंडबॉक्स नहीं है, तो अपना बैंक ऐप खोलकर पासबुक/बैलेंस तुरंत रीफ्रेश करें।',
              },
            ],
            practicalActivity: {
              title: 'दुकान की सुरक्षा नीति बनाएं:',
              instructions: [
                'काउंटर पर एक विनम्र बोर्ड लगाएं: "कृपया भुगतान के बाद हमारे फोन पर पुष्टि होने तक प्रतीक्षा करें।"',
                'अपने बैंक के आधिकारिक SMS सेंडर नाम (जैसे VK-HDFCBK, AXISBK, SBIINB) को पहचानना सीखें।',
              ],
            },
            keyTakeaways: [
              'ग्राहक के फोन का स्क्रीनशॉट असली भुगतान का पक्का सबूत नहीं है।',
              'पुष्टि हमेशा अपने खुद के फोन या साउंडबॉक्स से करें।',
              'शालीनता और दृढ़ता के साथ अपने व्यापार के नियमों का पालन करें।',
            ],
          },
          en: {
            introduction: 'Counterfeit Android APKs can simulate fake "Payment Successful" screens with green ticks and sound effects. Goods must only be handed over after your own device confirms settlement.',
            storyExample: {
              character: 'Anita Didi (Jewellery & Boutique)',
              title: 'Anita’s 10-Second Wait',
              story: 'A customer purchased ₹800 bangles, flashed his phone screen showing "Payment Successful", and tried to hurry away. Anita politely asked him to pause for 10 seconds for her phone notification. No credit arrived because his screenshot was fake. Caught, the buyer paid with real cash.',
            },
            sections: [
              {
                heading: '1. Never Trust the Buyer’s Screen Alone',
                body: 'Apps can fabricate realistic receipts. The sole authoritative source of truth is your own bank SMS, your merchant notification, or your soundbox.',
                tip: 'Be extra alert if a buyer urges you to hurry or creates a rush.',
              },
              {
                heading: '2. Soundboxes and Transaction Feeds',
                body: 'Voice soundboxes announce exact amounts immediately in Hindi or regional languages ("Received ₹250"). Alternatively, pull down to refresh your merchant transaction feed.',
                tip: 'Check that the sender’s name and exact amount tally.',
              },
            ],
            practicalActivity: {
              title: 'Storefront Verification Protocol:',
              instructions: [
                'Place a polite reminder at your counter: "Kindly allow a few seconds for SMS confirmation."',
                'Familiarize yourself with your bank’s official 6-character SMS sender ID header.',
              ],
            },
            keyTakeaways: [
              'A customer’s screen is not legal proof of credit.',
              'Verify payments solely through your own phone or voice box.',
              'Politely insist on confirmation before handing over merchandise.',
            ],
          },
        },
      },
    ],
    quiz: {
      id: 'quiz-digital-payments-safety',
      courseId: 'course-digital-payments-safety',
      title: {
        hi: 'डिजिटल सुरक्षा एवं भुगतान टेस्ट',
        en: 'Digital Safety & Payments Assessment',
      },
      passingScorePercent: 75,
      questions: [
        {
          id: 'qs1',
          question: {
            hi: 'यदि कोई व्यक्ति कहे कि "आपके खाते में ₹500 भेजने के लिए अपना UPI PIN डालें", तो आपको क्या करना चाहिए?',
            en: 'If someone tells you: "Enter your UPI PIN to receive ₹500 in your account", what should you do?',
          },
          options: {
            hi: [
              'तुरंत PIN डाल देना चाहिए ताकि पैसे आ जाएं',
              'PIN कभी नहीं डालना चाहिए, क्योंकि पैसे लेने के लिए PIN की ज़रूरत नहीं होती',
              'अपना बैंक खाता नंबर और OTP भी बता देना चाहिए',
              'अपने दोस्त का PIN डालना चाहिए',
            ],
            en: [
              'Enter the PIN immediately to receive the money',
              'Never enter the PIN, as receiving money requires zero PIN',
              'Share account number and OTP as well',
              'Enter a friend’s PIN instead',
            ],
          },
          correctOptionIndex: 1,
          explanation: {
            hi: 'पैसे प्राप्त करने के लिए कभी भी UPI PIN नहीं डाला जाता! यह एक ठगी का प्रयास है।',
            en: 'Never enter a UPI PIN to receive money! This is an unmistakable scam attempt.',
          },
        },
        {
          id: 'qs2',
          question: {
            hi: 'दुकान पर डिजिटल पेमेंट सफल हुई है या नहीं, इसकी सबसे सुरक्षित पुष्टि कैसे होती है?',
            en: 'What is the most reliable way to confirm that a customer’s digital payment actually went through?',
          },
          options: {
            hi: [
              'ग्राहक के फोन का स्क्रीनशॉट देखकर',
              'आपके अपने फोन पर बैंक SMS या साउंडबॉक्स की आवाज सुनकर',
              'ग्राहक की बातों पर पूरा भरोसा करके',
              'ग्राहक का फोन अपने हाथ में लेकर देखना',
            ],
            en: [
              'Looking at the customer’s phone screenshot',
              'Hearing your own soundbox or checking your own bank SMS notification',
              'Taking the customer’s verbal assurance',
              'Looking at an unverified photo',
            ],
          },
          correctOptionIndex: 1,
          explanation: {
            hi: 'पुष्टि हमेशा अपने खुद के फोन या साउंडबॉक्स पर ही करनी चाहिए, क्योंकि ग्राहक का स्क्रीनशॉट नकली हो सकता है।',
            en: 'Always verify through your own device or soundbox because buyer screens can be spoofed.',
          },
        },
        {
          id: 'qs3',
          question: {
            hi: 'ऑनलाइन वित्तीय धोखाधड़ी होने पर भारत में राष्ट्रीय साइबर हेल्पलाइन का नंबर क्या है?',
            en: 'What is the official national cyber fraud emergency helpline number in India?',
          },
          options: {
            hi: ['100', '1930', '108', '112'],
            en: ['100', '1930', '108', '112'],
          },
          correctOptionIndex: 1,
          explanation: {
            hi: '1930 भारत सरकार की आधिकारिक वित्तीय साइबर अपराध हेल्पलाइन है (cybercrime.gov.in)।',
            en: '1930 is India’s official financial cybercrime reporting emergency helpline (cybercrime.gov.in).',
          },
        },
      ],
    },
  },
  {
    id: 'course-whatsapp-social-marketing',
    category: 'digital_marketing',
    title: {
      hi: 'व्हाट्सएप और सोशल मीडिया से व्यापार कैसे बढ़ाएं',
      en: 'Growing Your Business via WhatsApp & Social Media',
    },
    shortDescription: {
      hi: 'सीखें कि WhatsApp Business कैटलॉग कैसे बनाएं, स्टेटस से नए ऑर्डर कैसे लें और स्थानीय ग्राहकों का भरोसा कैसे जीतें।',
      en: 'Set up WhatsApp Business catalogs, take orders through statuses, and market your products locally with zero advertising budget.',
    },
    fullDescription: {
      hi: 'आज लगभग हर ग्राहक के हाथ में स्मार्टफोन है। बिना किसी महंगे विज्ञापन के, केवल अपने व्हाट्सएप और सोशल मीडिया का सही उपयोग करके आप अपने मोहल्ले, गांव और पास के शहरों में 10 गुना ज्यादा ग्राहकों तक पहुंच सकती हैं। इस कोर्स में व्यावहारिक और सरल कदम सिखाए गए हैं।',
      en: 'Almost every potential buyer carries a smartphone. Without paying for expensive ads, leverage free WhatsApp Business tools, digital catalogs, and polite follow-ups to expand your customer base across your region.',
    },
    level: 'Beginner',
    estimatedHours: 2.0,
    languageAvailable: ['hi', 'en'],
    thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80',
    badgeTitle: {
      hi: 'डिजिटल मार्केटिंग सखी (Marketing Champion)',
      en: 'Social Commerce Champion',
    },
    rating: 4.8,
    reviewCount: 289,
    lessons: [
      {
        id: 'lesson-whatsapp-catalog',
        courseId: 'course-whatsapp-social-marketing',
        order: 1,
        durationMinutes: 15,
        title: {
          hi: '1. WhatsApp Business ऐप और प्रोडक्ट कैटलॉग बनाना',
          en: '1. Setting up WhatsApp Business & Digital Catalog',
        },
        summary: {
          hi: 'साधारण व्हाट्सएप की जगह WhatsApp Business क्यों ज़रूरी है और इसमें अपनी दुकान का डिजिटल शोकेस कैसे बनाएं।',
          en: 'Why WhatsApp Business is superior to personal WhatsApp and how to showcase your products with photos and prices.',
        },
        content: {
          hi: {
            introduction: 'WhatsApp Business एक मुफ़्त ऐप है जो आपकी जेब में आपकी पूरी दुकान बना देता है। ग्राहक बिना बार-बार फोटो मांगे आपकी पूरी वैरायटी एक जगह देख सकते हैं।',
            storyExample: {
              character: 'रुखसाना आपा (कढ़ाईदार चादरें व कुशन)',
              title: 'रुखसाना आपा की डिजिटल दुकान',
              story: 'रुखसाना आपा पहले हर ग्राहक को अलग-अलग 20 फोटो भेजती थीं, जिससे फोन भर जाता था और ग्राहक परेशान होते थे। उन्होंने WhatsApp Business में 6 चादरों का कैटलॉग बनाया जिसमें दाम और नाप लिखा था। अब वे सिर्फ एक लिंक भेजती हैं और ग्राहक खुद पसंद करके ऑर्डर दे देते हैं!',
            },
            sections: [
              {
                heading: '1. WhatsApp Business डाउनलोड व सेटअप',
                body: 'Google Play Store से "WhatsApp Business" डाउनलोड करें। अपनी दुकान या ब्रांड का नाम, पता, खुलने का समय और एक सुंदर लोगो या अपनी फोटो लगाएं।',
                tip: 'अपने व्यक्तिगत नंबर और व्यापार के नंबर को अलग रखना सबसे अच्छा होता है।',
              },
              {
                heading: '2. कैटलॉग में उत्पाद जोड़ना',
                body: 'Settings > Business Tools > Catalog में जाएं। "Add New Item" दबाएं। अच्छी रोशनी में ली गई 2 साफ तस्वीरें लगाएं, उत्पाद का नाम (जैसे: शुद्ध आम का आचार 500g), कीमत (₹180) और 2 लाइन का विवरण लिखें।',
                tip: 'तस्वीर हमेशा दिन के उजाले में साफ पृष्ठभूमि पर लें।',
              },
            ],
            practicalActivity: {
              title: 'आज ही पहला कैटलॉग आइटम बनाएं:',
              instructions: [
                'अपने सबसे लोकप्रिय उत्पाद को साफ मेज पर रखें।',
                'दिन की रोशनी में 2 अच्छी तस्वीरें खींचें।',
                'WhatsApp Business में विवरण और कीमत के साथ कैटलॉग में जोड़ें।',
                'अपने 3 परिचित ग्राहकों को इसका लिंक भेजकर उनकी राय लें।',
              ],
            },
            keyTakeaways: [
              'WhatsApp Business पूरी तरह से मुफ़्त और सुरक्षित है।',
              'कैटलॉग होने से ग्राहकों को आपकी दुकान अधिक पेशेवर लगती है।',
              'अच्छी तस्वीरें और स्पष्ट कीमत से बिक्री दोगुनी हो जाती है।',
            ],
          },
          en: {
            introduction: 'WhatsApp Business turns your phone into a professional digital storefront. Buyers can browse items, read descriptions, and see prices without clunky back-and-forth messaging.',
            storyExample: {
              character: 'Rukhsana Aapa (Embroidered Quilts & Linens)',
              title: 'Rukhsana’s Pocket Storefront',
              story: 'Rukhsana used to forward 25 individual photos to every prospective buyer, cluttering storage and confusing orders. By organizing a 6-item WhatsApp catalog with dimensions and fixed prices, she now sends one catalog link, speeding up purchases dramatically.',
            },
            sections: [
              {
                heading: '1. Download & Profile Setup',
                body: 'Install "WhatsApp Business" from Google Play Store. Add your business trade name, operational hours, workshop address, and a friendly profile icon.',
                tip: 'Using a dedicated SIM for business interactions keeps your personal family life organized.',
              },
              {
                heading: '2. Adding Catalog Items',
                body: 'Go to Settings > Business Tools > Catalog. Tap "Add New Item". Attach 2 crisp daylight photos, enter product title (e.g., Pure Mango Pickle 500g), retail price (₹180), and simple description.',
                tip: 'Photograph items against a clean, uncluttered background.',
              },
            ],
            practicalActivity: {
              title: 'Create Your First Item Entry:',
              instructions: [
                'Set your top-selling product on a clean table.',
                'Take 2 well-lit photos in natural daylight.',
                'Publish the entry in your WhatsApp catalog with transparent pricing.',
                'Share the catalog link with 3 loyal customers for feedback.',
              ],
            },
            keyTakeaways: [
              'WhatsApp Business is completely free to install and maintain.',
              'A clean catalog builds instant buyer credibility.',
              'Transparent pricing eliminates hesitation and closes sales faster.',
            ],
          },
        },
      },
    ],
    quiz: {
      id: 'quiz-whatsapp-social-marketing',
      courseId: 'course-whatsapp-social-marketing',
      title: {
        hi: 'सोशल मीडिया मार्केटिंग मूल्यांकन',
        en: 'Social Media Marketing Quiz',
      },
      passingScorePercent: 75,
      questions: [
        {
          id: 'qm1',
          question: {
            hi: 'साधारण व्हाट्सएप के मुकाबले WhatsApp Business का सबसे बड़ा व्यावसायिक फायदा क्या है?',
            en: 'What is the biggest operational advantage of WhatsApp Business over standard personal WhatsApp?',
          },
          options: {
            hi: [
              'इसमें उत्पाद कैटलॉग (फोटो व दाम सहित) और ऑटोमैटिक स्वागत संदेश की सुविधा होती है',
              'इसमें केवल गेम खेले जा सकते हैं',
              'यह इंटरनेट के बिना चलता है',
              'इसमें केवल फिल्में देखी जा सकती हैं',
            ],
            en: [
              'It provides product catalogs with prices and automated greeting messages',
              'It only runs video games',
              'It operates without any internet connectivity',
              'It is strictly for streaming movies',
            ],
          },
          correctOptionIndex: 0,
          explanation: {
            hi: 'WhatsApp Business में कैटलॉग, त्वरित उत्तर (Quick Replies) और व्यावसायिक प्रोफ़ाइल की सुविधा होती है जो व्यापार को गति देती है।',
            en: 'WhatsApp Business allows you to build product showcases, catalogs, and automated customer responses.',
          },
        },
        {
          id: 'qm2',
          question: {
            hi: 'कैटलॉग में उत्पाद की फोटो खींचते समय सबसे महत्वपूर्ण बात क्या है?',
            en: 'What is the most important guideline when taking product photos for your digital catalog?',
          },
          options: {
            hi: [
              'फोटो अंधेरे में खींचना चाहिए',
              'दिन के प्राकृतिक उजाले में साफ पृष्ठभूमि पर फोटो खींचना चाहिए',
              'इंटरनेट से किसी विदेशी कंपनी की नकली फोटो चुराकर लगाना',
              'केवल बिना फोटो के ही सामान बेचना चाहिए',
            ],
            en: [
              'Take photos in dark rooms',
              'Shoot in bright natural daylight against a clean, clutter-free background',
              'Copy fake stock images from international sites',
              'Never show photos of actual items',
            ],
          },
          correctOptionIndex: 1,
          explanation: {
            hi: 'दिन की प्राकृतिक रोशनी में खींची गई असली तस्वीर ग्राहक का विश्वास जीतती है।',
            en: 'Authentic photos taken in clean natural lighting establish real buyer trust.',
          },
        },
      ],
    },
  },
  {
    id: 'course-govt-schemes-resources',
    category: 'government_schemes',
    title: {
      hi: 'महिला उद्यमियों के लिए सरकारी योजनाएं और लोन गाइड',
      en: 'Government Schemes & Micro-Loan Guide for Women',
    },
    shortDescription: {
      hi: 'मुद्रा योजना (PMMY), उद्यम रजिस्ट्रेशन और स्वयं सहायता समूह (SHG) से बिना किसी दलाल के सहायता पाने की सही जानकारी।',
      en: 'Factual guide to Pradhan Mantri Mudra Yojana, free Udyam MSME certification, and SHG bank credit without middlemen.',
    },
    fullDescription: {
      hi: 'भारत सरकार और राज्य सरकारों के पास महिला उद्यमियों के लिए कम ब्याज दर और बिना गारंटी वाले लोन की कई योजनाएं हैं। इस कोर्स में जानें कि कौन-कौन सी योजनाएं असली हैं, क्या जरूरी कागजात चाहिए और दलालों के धोखे से बचकर सीधे बैंक या आधिकारिक पोर्टल पर कैसे आवेदन करें।',
      en: 'Learn how to leverage legitimate government microfinance programs like PMMY Mudra loans, Stand-Up India, and official MSME Udyam registration safely and transparently.',
    },
    level: 'Beginner',
    estimatedHours: 2.0,
    languageAvailable: ['hi', 'en'],
    thumbnail: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80',
    badgeTitle: {
      hi: 'योजना मार्गदर्शक सखी (Schemes Guide)',
      en: 'Govt Schemes Navigator',
    },
    rating: 4.9,
    reviewCount: 310,
    lessons: [
      {
        id: 'lesson-mudra-udyam',
        courseId: 'course-govt-schemes-resources',
        order: 1,
        durationMinutes: 18,
        title: {
          hi: '1. पीएम मुद्रा योजना और उद्यम रजिस्ट्रेशन का सच',
          en: '1. PMMY Mudra Loans & Free Udyam MSME Registration',
        },
        summary: {
          hi: 'शिशु, किशोर और तरुण लोन के नियम, और घर बैठे फ्री में सरकारी एमएसएमई प्रमाण पत्र कैसे बनाएं।',
          en: 'Eligibility rules for Shishu, Kishore loans and how to get your official MSME registration at zero fee.',
        },
        content: {
          hi: {
            introduction: 'कई महिलाएं सोचती हैं कि सरकारी लोन पाना नामुमकिन है या इसके लिए दलालों को पैसे देने पड़ते हैं। यह बिल्कुल गलत है। आइए जानते हैं आधिकारिक नियम।',
            storyExample: {
              character: 'कविता दीदी (डेयरी और दुग्ध उत्पाद)',
              title: 'कविता दीदी को कैसे मिला ₹50,000 का मुद्रा लोन',
              story: 'कविता दीदी ने अपनी 2 गायों से दूध का काम बढ़ाया। उन्होंने उद्यम आधार पर खुद फ्री रजिस्ट्रेशन किया और पास के ग्रामीण बैंक शाखा प्रबंधक को अपनी दैनिक बिक्री की डायरी दिखाई। बैंक ने उनके खाते के सही रिकॉर्ड देखकर बिना किसी गारंटी के शिशु मुद्रा लोन स्वीकृत किया!',
            },
            sections: [
              {
                heading: '1. प्रधानमंत्री मुद्रा योजना (PMMY) की 3 श्रेणियां',
                body: '- **शिशु लोन (Shishu):** ₹50,000 तक (नया काम या सिलाई मशीन/सामान के लिए)।\n- **किशोर लोन (Kishore):** ₹50,000 से ₹5 लाख तक (काम को बढ़ाने के लिए)।\n- **तरुण लोन (Tarun):** ₹5 लाख से ₹10 लाख तक।',
                tip: 'इसके लिए किसी संपत्ति या ज़मीन को गिरवी (Collateral-Free) रखने की आवश्यकता नहीं होती।',
              },
              {
                heading: '2. उद्यम रजिस्ट्रेशन (Udyam Registration)',
                body: 'आधिकारिक वेबसाइट udyamregistration.gov.in पर यह 100% मुफ़्त है। इसके लिए आधार कार्ड और बैंक खाते की आवश्यकता होती है। नकली वेबसाइटों से बचें जो ₹500 या ₹1,000 मांगती हैं।',
                tip: 'सरकारी वेबसाइट का पता हमेशा ".gov.in" पर समाप्त होता है।',
              },
            ],
            practicalActivity: {
              title: 'जरूरी दस्तावेजों की फाइल तैयार करें:',
              instructions: [
                'आधार कार्ड और पैन कार्ड की 2-2 फोटोकॉपी।',
                'बैंक पासबुक के पिछले 6 महीने के लेनदेन की कॉपी।',
                'दुकान या काम का बिजली बिल या रेंट एग्रीमेंट।',
                'अपने काम की 2 तस्वीरें एक साफ फोल्डर में रखें।',
              ],
            },
            keyTakeaways: [
              'उद्यम रजिस्ट्रेशन पूरी तरह मुफ़्त है; किसी दलाल को पैसे न दें।',
              'शिशु मुद्रा लोन में ₹50,000 तक बिना गारंटी सहायता मिलती है।',
              'हमेशा आधिकारिक ".gov.in" वेबसाइटों पर ही भरोसा करें।',
            ],
          },
          en: {
            introduction: 'Grassroots women often assume bank micro-loans are unattainable or require commission payments to middlemen. Learn the transparent, official guidelines directly from banking authorities.',
            storyExample: {
              character: 'Kavita Didi (Dairy & Milk Cooperative)',
              title: 'Kavita’s Collateral-Free Bank Success',
              story: 'Kavita expanded her dairy micro-enterprise from 2 to 4 cows. She completed her free Udyam MSME certificate online, maintained a clean daily sales ledger, and presented her business notebook to the rural bank branch manager, securing a ₹50,000 Shishu Mudra loan with zero collateral.',
            },
            sections: [
              {
                heading: '1. Pradhan Mantri Mudra Yojana (PMMY) Tiers',
                body: '- **Shishu Tier:** Loans up to ₹50,000 for starting or small equipment purchases.\n- **Kishore Tier:** Loans from ₹50,000 to ₹5,00,000 for expansion.\n- **Tarun Tier:** Loans from ₹5,00,000 to ₹10,00,000.',
                tip: 'Mudra loans are collateral-free under government guarantee schemes.',
              },
              {
                heading: '2. Official Free Udyam MSME Registration',
                body: 'The government portal udyamregistration.gov.in is 100% free. Never pay commercial private portals claiming fees for MSME certificates.',
                tip: 'Official central government portals always end in ".gov.in".',
              },
            ],
            practicalActivity: {
              title: 'Organize Your Loan Application Portfolio:',
              instructions: [
                'Photocopies of Aadhaar Card and PAN Card.',
                'Bank passbook statement showing past 6 months of steady activity.',
                '2 photographs of your production unit, workshop, or shopfront.',
                'A 1-page summary of your sales and estimated profit.',
              ],
            },
            keyTakeaways: [
              'Udyam registration is 100% free of charge on .gov.in.',
              'Shishu Mudra loans provide up to ₹50,000 with zero collateral.',
              'Keep written business records to impress local bank managers.',
            ],
          },
        },
      },
    ],
    quiz: {
      id: 'quiz-govt-schemes-resources',
      courseId: 'course-govt-schemes-resources',
      title: {
        hi: 'सरकारी योजना ज्ञान टेस्ट',
        en: 'Govt Schemes Knowledge Check',
      },
      passingScorePercent: 75,
      questions: [
        {
          id: 'qg1',
          question: {
            hi: 'प्रधानमंत्री मुद्रा योजना के तहत "शिशु लोन" में अधिकतम कितनी राशि का लोन मिलता है?',
            en: 'Under Pradhan Mantri Mudra Yojana, what is the maximum limit for a "Shishu" tier loan?',
          },
          options: {
            hi: ['₹10,000', '₹50,000', '₹5,00,000', '₹10,00,000'],
            en: ['₹10,000', '₹50,000', '₹5,00,000', '₹10,00,000'],
          },
          correctOptionIndex: 1,
          explanation: {
            hi: 'शिशु लोन की सीमा ₹50,000 तक है। ₹50,000 से ₹5 लाख तक का लोन किशोर श्रेणी में आता है।',
            en: 'Shishu tier covers micro-loans up to ₹50,000.',
          },
        },
        {
          id: 'qg2',
          question: {
            hi: 'सरकारी उद्यम (Udyam MSME) रजिस्ट्रेशन कराने की आधिकारिक सरकारी फीस कितनी है?',
            en: 'What is the official government fee for registering an MSME on the official Udyam portal?',
          },
          options: {
            hi: ['₹0 (बिल्कुल मुफ़्त)', '₹500', '₹1,500', '₹2,000'],
            en: ['₹0 (Completely Free)', '₹500', '₹1,500', '₹2,000'],
          },
          correctOptionIndex: 0,
          explanation: {
            hi: 'उद्यम रजिस्ट्रेशन भारत सरकार के पोर्टल (udyamregistration.gov.in) पर 100% मुफ़्त है। जो वेबसाइटें पैसे मांगती हैं वे अनधिकृत होती हैं।',
            en: 'Udyam registration is 100% free on the official government website (udyamregistration.gov.in).',
          },
        },
      ],
    },
  },
];
