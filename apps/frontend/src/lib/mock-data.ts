export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  price: number;
  rentalPrice: number;
  status: 'AVAILABLE' | 'RENTED' | 'RESERVED';
  stock: number;
  cover: string;
  rating: number;
};

export const books: Book[] = [
  {
    id: 'atomic-habits',
    title: 'Atomic Habits',
    author: 'James Clear',
    category: 'Personal Growth',
    description: 'Build systems that help your habits stick and scale without relying on motivation alone.',
    price: 18000,
    rentalPrice: 2500,
    status: 'AVAILABLE',
    stock: 12,
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
    rating: 4.9,
  },
  {
    id: 'the-lean-startup',
    title: 'The Lean Startup',
    author: 'Eric Ries',
    category: 'Business',
    description: 'Learn how to test ideas quickly, validate demand, and build sustainable products.',
    price: 22000,
    rentalPrice: 3000,
    status: 'RENTED',
    stock: 4,
    cover: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80',
    rating: 4.7,
  },
  {
    id: 'deep-work',
    title: 'Deep Work',
    author: 'Cal Newport',
    category: 'Productivity',
    description: 'A practical guide to producing high-quality work in a distracted world.',
    price: 19000,
    rentalPrice: 2600,
    status: 'AVAILABLE',
    stock: 8,
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80',
    rating: 4.8,
  },
  {
    id: 'the-power-of-habit',
    title: 'The Power of Habit',
    author: 'Charles Duhigg',
    category: 'Psychology',
    description: 'Discover how routines shape our lives and how to redesign them intentionally.',
    price: 21000,
    rentalPrice: 2800,
    status: 'RESERVED',
    stock: 3,
    cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80',
    rating: 4.6,
  },
];

export const dashboardMetrics = [
  { label: 'Total members', value: '1,240' },
  { label: 'Active subscribers', value: '392' },
  { label: 'Books', value: '1,860' },
  { label: 'Available copies', value: '1,204' },
  { label: 'Rented copies', value: '286' },
  { label: 'Revenue', value: '₦3.2M' },
];

export const plans = [
  { name: 'Starter', days: 30, price: 6500, books: 2, description: 'For flexible casual readers.' },
  { name: 'Club Plus', days: 60, price: 12000, books: 4, description: 'Balanced access for regular renters.' },
  { name: 'Unlimited', days: 90, price: 18000, books: 8, description: 'Perfect for avid readers and frequent borrowers.' },
];

export const inventoryItems = [
  { copy: 'RBC-ATOMIC-0001', title: 'Atomic Habits', status: 'AVAILABLE', member: '—', dueDate: '—' },
  { copy: 'RBC-LEAN-0004', title: 'The Lean Startup', status: 'RENTED', member: 'John Doe', dueDate: '16 Oct 2026' },
  { copy: 'RBC-DEEP-0008', title: 'Deep Work', status: 'AVAILABLE', member: '—', dueDate: '—' },
  { copy: 'RBC-HABIT-0012', title: 'The Power of Habit', status: 'RESERVED', member: 'Mary Gate', dueDate: '18 Oct 2026' },
];

export const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/books', label: 'Books' },
  { href: '/books/rent', label: 'Rent' },
  { href: '/books/sale', label: 'Buy' },
  { href: '/subscription', label: 'Membership' },
  { href: '/dashboard', label: 'Dashboard' },
];
