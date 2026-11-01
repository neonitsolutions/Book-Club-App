import { Schema } from 'mongoose';
import { AuditLog, AuditLogSchema } from '../audit/audit-log.schema';
import { Session, SessionSchema } from '../auth/session.schema';
import { Author, AuthorSchema } from '../books/author.schema';
import { Book, BookSchema } from '../books/book.schema';
import { Category, CategorySchema } from '../books/category.schema';
import { BookCopy, BookCopySchema } from '../inventory/book-copy.schema';
import {
  Notification,
  NotificationSchema,
} from '../notifications/notification.schema';
import { Cart, CartSchema } from '../orders/cart.schema';
import { Order, OrderSchema } from '../orders/order.schema';
import {
  PaymentEvent,
  PaymentEventSchema,
} from '../payments/payment-event.schema';
import { Payment, PaymentSchema } from '../payments/payment.schema';
import { Rental, RentalSchema } from '../rentals/rental.schema';
import { ScanEvent, ScanEventSchema } from '../scans/scan-event.schema';
import {
  Membership,
  MembershipSchema,
} from '../subscriptions/membership.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from '../subscriptions/subscription-plan.schema';
import { User, UserSchema } from '../users/user.schema';
import { Counter, CounterSchema } from './counter.schema';

/**
 * Every collection in the app. The Nest modules register their own subset;
 * this full list is for the standalone scripts (seed, index sync) and tests.
 */
export const ALL_MODELS: { name: string; schema: Schema }[] = [
  { name: User.name, schema: UserSchema },
  { name: Session.name, schema: SessionSchema },
  { name: Counter.name, schema: CounterSchema },
  { name: Category.name, schema: CategorySchema },
  { name: Author.name, schema: AuthorSchema },
  { name: Book.name, schema: BookSchema },
  { name: BookCopy.name, schema: BookCopySchema },
  { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
  { name: Membership.name, schema: MembershipSchema },
  { name: Payment.name, schema: PaymentSchema },
  { name: PaymentEvent.name, schema: PaymentEventSchema },
  { name: Rental.name, schema: RentalSchema },
  { name: Cart.name, schema: CartSchema },
  { name: Order.name, schema: OrderSchema },
  { name: ScanEvent.name, schema: ScanEventSchema },
  { name: Notification.name, schema: NotificationSchema },
  { name: AuditLog.name, schema: AuditLogSchema },
];
