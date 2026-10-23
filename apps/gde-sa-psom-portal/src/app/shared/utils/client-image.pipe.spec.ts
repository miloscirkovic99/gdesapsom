import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClientImagePipe } from './client-image.pipe';

describe('ClientImagePipe', () => {
  const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

  const pipeOn = (platform: 'browser' | 'server') => {
    TestBed.configureTestingModule({ providers: [ClientImagePipe, { provide: PLATFORM_ID, useValue: platform }] });
    return TestBed.inject(ClientImagePipe);
  };

  it('keeps every image in the browser', () => {
    const pipe = pipeOn('browser');

    expect(pipe.transform(photo)).toBe(photo);
    expect(pipe.transform('assets/logo-normal.png')).toBe('assets/logo-normal.png');
  });

  it('leaves base64 photos out of the prerendered HTML, files stay', () => {
    const pipe = pipeOn('server');

    expect(pipe.transform(photo)).toBeNull();
    expect(pipe.transform('assets/park.jpg')).toBe('assets/park.jpg');
    expect(pipe.transform('https://www.gdesapsom.com/api/v2/dog-food/images/4')).toBe(
      'https://www.gdesapsom.com/api/v2/dog-food/images/4',
    );
  });

  it('turns a missing image into no src', () => {
    const pipe = pipeOn('browser');

    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform('')).toBeNull();
  });
});
