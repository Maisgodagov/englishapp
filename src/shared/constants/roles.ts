export enum UserRole {
  Student = 'student',
  Teacher = 'teacher',
  Admin = 'admin',
}

export const roleDisplayName: Record<UserRole, string> = {
  [UserRole.Student]: 'Ученик',
  [UserRole.Teacher]: 'Преподаватель',
  [UserRole.Admin]: 'Администратор',
};


