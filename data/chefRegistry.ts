
import { Chef } from '../types';

export const VERIFIED_CHEFS: Chef[] = [
  {
    id: 'castro-boateng',
    name: 'Castro Boateng',
    bio: 'Chef Castro Boateng is the mastermind behind HOB Fine Foods. Known for his "Global Roots, Island Soul" philosophy, he creates intricate West African influenced West Coast cuisine. His long-table events at HOB are legendary for their vibrancy and communal spirit.',
    culinaryStyle: 'Global Roots / West African Influence',
    imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 250,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { 
      website: 'https://www.hobfinefoods.ca', 
      instagram: 'https://instagram.com/chef_castro_boateng' 
    }
  },
  {
    id: 'kyle-gerrard',
    name: 'Kyle Gerrard',
    bio: 'Kyle Gerrard leads Green Artichoke, specializing in intimate private chef experiences. His focus is on hyper-local ingredients sourced directly from Saanich farmers, presented in elegant, multi-course formats.',
    culinaryStyle: 'Hyper-Local Fine Dining',
    imageUrl: 'https://images.unsplash.com/photo-1583394293214-28dea15ee548?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 95,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://greenartichoke.ca' }
  },
  {
    id: 'good-for-you-gourmet',
    name: 'Good For You Gourmet',
    bio: 'Led by a team of dedicated health-conscious chefs, Good For You Gourmet provides organic, health-supportive personal chef services and intimate event catering focused on wellness and flavor.',
    culinaryStyle: 'Organic / Health-Supportive',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 180,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'http://gfyg.ca' }
  },
  {
    id: 'cheryls-gourmet',
    name: 'Cheryl’s Gourmet Pantry',
    bio: 'A cornerstone of Victoria\'s culinary scene, Cheryl\'s Gourmet Pantry offers classically inspired gourmet experiences. From high-end boutique catering to intimate chef-led dinners.',
    culinaryStyle: 'Classical Gourmet / Boutique Catering',
    imageUrl: 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 400,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://cherylsgourmetpantry.com' }
  },
  {
    id: 'the-long-table-series',
    name: 'James & Alana Day',
    bio: 'Creators of The Long Table Series, James and Alana focus on the ritual of the meal. Their events are designed to foster connection through shared platters and farm-side settings.',
    culinaryStyle: 'Communal Ritual / Farm-to-Table',
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 60,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { facebook: 'https://www.facebook.com/thelongtableseries/' }
  },
  {
    id: 'chef-sandi',
    name: 'Chef Sandi',
    bio: 'The vision behind Secret Supper, Chef Sandi specializes in harvest-style dinners in unconventional locations. Her storytelling through food emphasizes the connection between land and table.',
    culinaryStyle: 'Secret Location / Narrative Dining',
    imageUrl: 'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 40,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://www.secretsupper.co' }
  },
  {
    id: 'natures-chef',
    name: 'Nature’s Chef Team',
    bio: 'Nature\'s Chef offers wild-crafted culinary experiences. Specializing in foraged ingredients and outdoor fire-cooked meals that honor the natural environment of the West Coast.',
    culinaryStyle: 'Wild-Crafted / Foraged / Fire-Cooked',
    imageUrl: 'https://images.unsplash.com/photo-1534766570532-f9ffd3ad90b0?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 110,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://natureschef.ca' }
  },
  {
    id: 'paul-moran',
    name: 'Paul Moran',
    bio: 'Winner of Top Chef Canada, Paul Moran is a master forager and culinary innovator. He hosts exclusive guest chef appearances at various farm dinners across Saanich and Vancouver Island.',
    culinaryStyle: 'Modern Canadian / Foraged Wild',
    imageUrl: 'https://images.unsplash.com/photo-1595273670150-db0a3d39074f?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 150,
    verified: true,
    region: 'Vancouver Island',
    socialLinks: { instagram: 'https://www.instagram.com/chefpaulmoran/' }
  },
  {
    id: 'brian-tessolin',
    name: 'Brian Tessolin',
    bio: 'Known for Italian-inspired pop-ups in the Victoria area, Brian focuses on the art of fresh pasta and traditional rustic flavors reimagined for the modern palette.',
    culinaryStyle: 'Modern Italian / Fresh Pasta',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 45,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://www.takeachef.com/en-ca/private-chef/victoria' }
  },
  {
    id: 'sam-harris',
    name: 'Sam Harris',
    bio: 'A collaborative chef known for unique pop-up experiences in the Victoria region. Sam\'s style is eclectic, often blending global techniques with local seasonal harvests.',
    culinaryStyle: 'Eclectic Collaborative Pop-ups',
    imageUrl: 'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 55,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://www.takeachef.com/en-ca/private-chef/victoria' }
  },
  {
    id: 'james-frost',
    name: 'James Frost',
    bio: 'James Frost creates sophisticated 7-course pop-up experiences, often at notable Victoria venues like Café Brio. His approach is highly technical and refined.',
    culinaryStyle: '7-Course Technical / Modern European',
    imageUrl: 'https://images.unsplash.com/photo-1541512416146-3cf58d6b27cc?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 35,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://victoriabuzz.com/2025/08/victoria-chef-hosting-unique-7-course-italian-dinner-pop-up-at-cafe-brio/' }
  },
  {
    id: 'kreg-graham',
    name: 'Kreg Graham',
    bio: 'Kreg Graham is a veteran of the Victoria dining scene, famous for hosting atmospheric long-table dining events that celebrate the bounty of summer.',
    culinaryStyle: 'Atmospheric Long-Table / Seasonal',
    imageUrl: 'https://images.unsplash.com/photo-1560616639-2180572b1464?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 200,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://www.yammagazine.com/long-table-dining-events-for-summertime/' }
  },
  {
    id: 'kristian-eligh',
    name: 'Kristian Eligh',
    bio: 'The driving force behind Marilena Cafe & Raw Bar. Kristian brings world-class seafood expertise and high-end restaurant precision to unique collaborative events.',
    culinaryStyle: 'High-End Seafood / Raw Bar',
    imageUrl: 'https://images.unsplash.com/photo-1581339394656-ec79087ec8a0?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 120,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://www.yammagazine.com/2025-yam-best-restaurant-awards/' }
  },
  {
    id: 'kiran-kolathodan',
    name: 'Kiran Kolathodan',
    bio: 'Co-founder of Cafe Malabar, Kiran is a pioneer of authentic Kerala cuisine in Victoria, hosting events that explore the deep history of coastal Indian spice trade.',
    culinaryStyle: 'Kerala Coastal / Authentic Spice',
    imageUrl: 'https://images.unsplash.com/photo-1582819509237-d5b75f24ffbf?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 80,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://www.cafemalabar.ca' }
  },
  {
    id: 'karma-tenpa',
    name: 'Karma Tenpa',
    bio: 'Karma Tenpa brings a wealth of traditional knowledge to Cafe Malabar, crafting communal dining experiences that emphasize the soul and heritage of Indian street food and fine spices.',
    culinaryStyle: 'Heritage Indian / Street Food Fusion',
    imageUrl: 'https://images.unsplash.com/photo-1628236751818-202e2060019e?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 75,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://www.cafemalabar.ca' }
  },
  {
    id: 'heidi-fink',
    name: 'Heidi Fink',
    bio: 'Chef Heidi Fink is a beloved Victoria educator and chef. Her events are immersive journeys into international cuisines, often including a teaching element alongside the feast.',
    culinaryStyle: 'International Instructional Dining',
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=600',
    pastEventsCount: 500,
    verified: true,
    region: 'Victoria, BC',
    socialLinks: { website: 'https://www.chefheidifink.com' }
  }
];
