import { Test, TestingModule } from '@nestjs/testing';
import { OutingsController } from './outings.controller';

describe('OutingsController', () => {
  let controller: OutingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutingsController],
    }).compile();

    controller = module.get<OutingsController>(OutingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
