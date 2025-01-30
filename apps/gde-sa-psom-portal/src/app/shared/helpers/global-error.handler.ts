    
    const globalHandleError = (snackbarService: any) => {
      snackbarService.openSnackbar(
        'Oops... Something went wrong, please check your fields and try again',
        'Close',
        'error-snackbar'
      );
    };