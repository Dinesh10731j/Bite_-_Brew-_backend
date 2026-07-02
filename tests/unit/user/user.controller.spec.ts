const mockUserServiceInstance = {
  createStaff: jest.fn(),
  updateStaff: jest.fn(),
  deleteStaff: jest.fn(),
  listStaff: jest.fn(),
  listUsers: jest.fn(),
  getById: jest.fn(),
  updateRole: jest.fn(),
};

const mockUploadServiceInstance = {
  uploadImage: jest.fn(),
};

jest.mock('../../../src/service/user/user.service', () => ({
  UserService: jest.fn(() => mockUserServiceInstance),
}));

jest.mock('../../../src/service/upload/upload.service', () => ({
  UploadService: jest.fn(() => mockUploadServiceInstance),
}));

import { UserController } from '../../../src/controller/user/user.controller';

describe('UserController staff endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a staff member with the provided data', async () => {
    const req = {
      body: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    mockUserServiceInstance.createStaff.mockResolvedValue({
      id: 'staff-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'staff',
      image: undefined,
    });

    await UserController.createStaff(req, res);

    expect(mockUserServiceInstance.createStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Resource created successfully' }));
  });
});
