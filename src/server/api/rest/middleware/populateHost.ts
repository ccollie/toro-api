import boom from '@hapi/boom';

export const populateHost = (req, res, next) => {
  const { host } = req.params;
  const { supervisor } = req.app.locals;
  const hostMgr = supervisor.getHost(host);
  if (!hostMgr) {
    next(boom.notFound(`Host "${host}" not found`));
  } else {
    res.locals.host = hostMgr;
    res.locals.hostManager = hostMgr;
    next();
  }
};
