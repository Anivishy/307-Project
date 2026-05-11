import creamyPan from "../../assets/creamy-pan.jpg";
import flameWok from "../../assets/flame-wok.jpg";
import spicyStirFry from "../../assets/spicy-stir-fry.jpg";

export const categories = ["All", "Western", "Bread", "Soup", "Dessert", "Coffee"];

export const recipes = [
  {
    id: "creamy-tuscan-chicken",
    title: "Creamy Tuscan Chicken",
    category: "Western",
    image: creamyPan,
    time: "25 min",
    servings: 2,
    difficulty: "Medium",
    saved: true,
    rating: 4.8,
    description:
      "A rich skillet dinner with garlic, herbs, mushrooms, and a creamy sauce that works well for group cooking.",
    ingredients: ["2 chicken fillets", "1 cup mushrooms", "1/2 cup cream", "2 garlic cloves", "Fresh thyme"],
    instructions: [
      "Season the protein and sear it in a hot pan until golden.",
      "Add mushrooms and garlic, then cook until softened.",
      "Pour in cream and simmer until the sauce coats the spoon.",
      "Finish with herbs and serve with rice or bread.",
    ],
  },
  {
    id: "spicy-tofu-stir-fry",
    title: "Spicy Tofu Stir Fry",
    category: "Soup",
    image: spicyStirFry,
    time: "20 min",
    servings: 4,
    difficulty: "Easy",
    saved: false,
    rating: 4.6,
    description:
      "Crispy tofu, peppers, scallions, and a glossy sauce for a fast vegetarian group meal.",
    ingredients: ["1 block tofu", "2 bell peppers", "2 scallions", "Soy sauce", "Chili garlic sauce"],
    instructions: [
      "Press and cube the tofu, then sear until crisp.",
      "Cook peppers and scallions over high heat.",
      "Add sauce and toss until everything is glossy.",
      "Serve over rice and top with extra scallions.",
    ],
  },
  {
    id: "flame-wok-noodles",
    title: "Flame Wok Noodles",
    category: "Western",
    image: flameWok,
    time: "18 min",
    servings: 3,
    difficulty: "Easy",
    saved: true,
    rating: 4.7,
    description:
      "A bright noodle bowl built from pantry vegetables and a quick savory sauce.",
    ingredients: ["Noodles", "Mixed vegetables", "1 egg", "Soy sauce", "Sesame oil"],
    instructions: [
      "Boil noodles until just tender.",
      "Stir fry vegetables in a hot wok.",
      "Add noodles, egg, and sauce.",
      "Toss until coated and serve immediately.",
    ],
  },
  {
    id: "breakfast-wraps",
    title: "Breakfast Wraps",
    category: "Bread",
    image: creamyPan,
    time: "15 min",
    servings: 4,
    difficulty: "Easy",
    saved: false,
    rating: 4.4,
    description:
      "Quick wraps using eggs, vegetables, and any leftover sauce from the group pantry.",
    ingredients: ["4 tortillas", "4 eggs", "1 pepper", "Cheese", "Hot sauce"],
    instructions: [
      "Scramble eggs with diced peppers.",
      "Warm tortillas in a dry pan.",
      "Fill each tortilla and fold tightly.",
      "Toast both sides until the wrap holds together.",
    ],
  },
];

export const pantryItems = [
  { id: "eggs", name: "Eggs", quantity: "6 pieces", status: "Fresh", color: "orange" },
  { id: "broccoli", name: "Broccoli", quantity: "2 heads", status: "Use soon", color: "green" },
  { id: "rice", name: "Rice", quantity: "4 cups", status: "Staple", color: "yellow" },
  { id: "yogurt", name: "Greek yogurt", quantity: "1 tub", status: "Opened", color: "blue" },
  { id: "garlic", name: "Garlic", quantity: "8 cloves", status: "Shared", color: "purple" },
];

export const groups = [
  {
    id: "dorm-dinner-crew",
    name: "Dorm Dinner Crew",
    members: 4,
    image: creamyPan,
    description: "Weeknight recipes using shared groceries.",
  },
  {
    id: "family-sunday",
    name: "Family Sunday",
    members: 6,
    image: flameWok,
    description: "Big-batch meals with allergy notes.",
  },
  {
    id: "veggie-lab",
    name: "Veggie Lab",
    members: 3,
    image: spicyStirFry,
    description: "Vegetarian ideas and pantry experiments.",
  },
];

export const approvalRequests = [
  { id: 1, member: "Ani", item: "2 eggs", recipe: "Breakfast Wraps", remaining: "6 -> 4" },
  { id: 2, member: "Leon", item: "1 cup rice", recipe: "Miso Veggie Rice", remaining: "4 cups -> 3 cups" },
  { id: 3, member: "Vinayak", item: "3 garlic cloves", recipe: "Tomato Pasta", remaining: "8 -> 5 cloves" },
];
