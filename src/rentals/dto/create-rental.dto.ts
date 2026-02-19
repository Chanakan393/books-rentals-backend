export class CreateRentalDto {
  userId: string;
  bookId: string;
  days: number; // ต้องส่งมาด้วยว่าเช่ากี่วัน (3, 5, 7)
}