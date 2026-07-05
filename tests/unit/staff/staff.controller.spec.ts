const mockStaffServiceInstance = {
  listStaff: jest.fn(),
  getStaffById: jest.fn(),
  createStaff: jest.fn(),
  updateStaff: jest.fn(),
  deleteStaff: jest.fn(),
};

jest.mock('../../../src/service/staff/staff.service', () => ({
  StaffService: jest.fn(() => mockStaffServiceInstance),
}));

import { StaffController } from '../../../src/controller/staff/staff.controller';

describe('StaffController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a staff member using the photo field from the request payload', async () => {
    const req = {
      body: {
        name: 'Dinesh Tamang',
        email: 'dinesh@gmail.com',
        role: 'staff',
        photo: 'https://example.com/staff.jpg',
      },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    mockStaffServiceInstance.createStaff.mockResolvedValue({
      id: 'staff-1',
      name: 'Dinesh Tamang',
      email: 'dinesh@gmail.com',
      role: 'staff',
      image: 'https://example.com/staff.jpg',
    });

    await StaffController.create(req, res);

    expect(mockStaffServiceInstance.createStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Dinesh Tamang',
        email: 'dinesh@gmail.com',
        role: 'staff',
        image: 'https://example.com/staff.jpg',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
